import { pool } from '../db/pool.js';
import { sendMail } from './mailer.js';

const BRAND = '#1F5C4D';
const APP_URL = process.env.APP_URL || 'http://localhost:5173';

function formatDate(d) {
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function shell({ heading, body, cta }) {
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#1A1A1A">
      <div style="background:${BRAND};padding:20px 24px;border-radius:10px 10px 0 0">
        <span style="color:#fff;font-size:18px;font-weight:bold">LeaveFlow</span>
      </div>
      <div style="border:1px solid #E7E4DC;border-top:none;border-radius:0 0 10px 10px;padding:24px">
        <h2 style="margin:0 0 12px;font-size:17px">${heading}</h2>
        <div style="font-size:14px;line-height:1.6;color:#333">${body}</div>
        ${cta ? `<div style="margin-top:20px"><a href="${cta.href}" style="background:${BRAND};color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:bold">${cta.label}</a></div>` : ''}
      </div>
    </div>
  `;
}

function requestSummary(row) {
  return `${row.type_emoji || ''} <b>${row.type_name}</b> leave, ${formatDate(row.start_date)} – ${formatDate(row.end_date)} (${row.days} day${row.days === 1 ? '' : 's'})`;
}

async function getHrRecipients(orgId) {
  const { rows } = await pool.query(`SELECT name, email FROM users WHERE org_id = $1 AND role = 'hr'`, [orgId]);
  return rows;
}

export async function notifyRequestSubmitted(row) {
  try {
    await sendMail({
      to: row.staff_email,
      subject: `Leave request submitted — ${row.type_name}`,
      html: shell({
        heading: `Your request is under review`,
        body: `Hi ${row.staff_name.split(' ')[0]},<br><br>Your request for ${requestSummary(row)} has been submitted and is now under review by your Head of Department${row.hod_name ? `, ${row.hod_name}` : ''}. You'll get another email once a decision is made.`
      })
    });

    if (row.hod_email) {
      await sendMail({
        to: row.hod_email,
        subject: `Action needed — leave request from ${row.staff_name}`,
        html: shell({
          heading: `A leave request needs your review`,
          body: `${row.staff_name} has requested ${requestSummary(row)}.<br><br>Reason: "${row.reason}"`,
          cta: { href: `${APP_URL}/approvals`, label: 'Review request' }
        })
      });
    }
  } catch (err) {
    console.error('[notifications] notifyRequestSubmitted failed:', err.message);
  }
}

export async function notifyForwardedToHr(row) {
  try {
    await sendMail({
      to: row.staff_email,
      subject: `Leave request approved by your HoD — ${row.type_name}`,
      html: shell({
        heading: `Approved by your Head of Department`,
        body: `Hi ${row.staff_name.split(' ')[0]},<br><br>Your request for ${requestSummary(row)} has been approved by your Head of Department and forwarded to HR to finalise.`
      })
    });

    const hrUsers = await getHrRecipients(row.org_id);
    for (const hr of hrUsers) {
      await sendMail({
        to: hr.email,
        subject: `Action needed — finalise leave request for ${row.staff_name}`,
        html: shell({
          heading: `A leave request needs finalising`,
          body: `${row.staff_name} has requested ${requestSummary(row)}, approved by their HoD${row.hod_name ? ` (${row.hod_name})` : ''} and now awaiting your final sign-off.`,
          cta: { href: `${APP_URL}/all-requests`, label: 'Finalise request' }
        })
      });
    }
  } catch (err) {
    console.error('[notifications] notifyForwardedToHr failed:', err.message);
  }
}

export async function notifyAutoApproved(row) {
  try {
    await sendMail({
      to: row.staff_email,
      subject: `Leave request approved — ${row.type_name}`,
      html: shell({
        heading: `Your leave request was approved`,
        body: `Hi ${row.staff_name.split(' ')[0]},<br><br>Good news — your request for ${requestSummary(row)} has been approved.`
      })
    });
  } catch (err) {
    console.error('[notifications] notifyAutoApproved failed:', err.message);
  }
}

export async function notifyDeclined(row, note) {
  try {
    await sendMail({
      to: row.staff_email,
      subject: `Leave request declined — ${row.type_name}`,
      html: shell({
        heading: `Your leave request was declined`,
        body: `Hi ${row.staff_name.split(' ')[0]},<br><br>Your request for ${requestSummary(row)} was declined by your Head of Department.${note ? `<br><br>Note: "${note}"` : ''}`
      })
    });
  } catch (err) {
    console.error('[notifications] notifyDeclined failed:', err.message);
  }
}

export async function notifyFinalised(row) {
  try {
    await sendMail({
      to: row.staff_email,
      subject: `Leave request finalised — ${row.type_name}`,
      html: shell({
        heading: `Your leave request is fully approved`,
        body: `Hi ${row.staff_name.split(' ')[0]},<br><br>Your request for ${requestSummary(row)} has been finalised by HR. Enjoy your time off!`
      })
    });

    if (row.hod_email) {
      await sendMail({
        to: row.hod_email,
        subject: `Finalised by HR — ${row.staff_name}'s leave request`,
        html: shell({
          heading: `Loop closed on a request you approved`,
          body: `HR has finalised ${row.staff_name}'s request for ${requestSummary(row)}, which you approved earlier. No action needed.`
        })
      });
    }
  } catch (err) {
    console.error('[notifications] notifyFinalised failed:', err.message);
  }
}
