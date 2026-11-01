import Papa from 'papaparse';

export const STAFF_CSV_HEADERS = ['name', 'email', 'role', 'title', 'department'];

export const STAFF_CSV_TEMPLATE =
  'name,email,role,title,department\n' +
  'Afia Owusu,afia.owusu@example.com,staff,Staff Nurse,Nursing\n' +
  'Dr. Salifu Adam,salifu.adam@example.com,hod,Head of Nursing,Nursing\n';

export function downloadStaffCsvTemplate() {
  const blob = new Blob([STAFF_CSV_TEMPLATE], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'staff-import-template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// Parses a staff CSV file into row objects shaped for POST /api/staff/bulk.
// Unrecognised columns are ignored; missing optional columns just come back empty.
export function parseStaffCsv(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: (results) => {
        const rows = results.data.map((r) => ({
          name: (r.name || '').trim(),
          email: (r.email || '').trim(),
          role: (r.role || '').trim(),
          title: (r.title || '').trim(),
          department: (r.department || '').trim()
        }));
        const parseErrors = (results.errors || []).map((e) => `Row ${e.row + 2}: ${e.message}`);
        resolve({ rows, parseErrors });
      },
      error: (err) => reject(err)
    });
  });
}
