import swaggerJsdoc from 'swagger-jsdoc';

const spec = swaggerJsdoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'LeaveFlow API',
      version: '1.0.0',
      description:
        'REST API for LeaveFlow, a multi-tenant leave request and approval platform. ' +
        'Auth is a JWT stored in an httpOnly `token` cookie set by `POST /auth/login` — ' +
        'use "Authorize" below (or send the cookie automatically from a browser session) to call protected endpoints.'
    },
    servers: [{ url: '/api', description: 'Current host' }],
    tags: [
      { name: 'Auth' },
      { name: 'Requests' },
      { name: 'Balances' },
      { name: 'Staff' },
      { name: 'Leave types' },
      { name: 'Organisation' },
      { name: 'Insights' }
    ],
    components: {
      securitySchemes: {
        cookieAuth: { type: 'apiKey', in: 'cookie', name: 'token' }
      },
      parameters: {
        RequestId: {
          in: 'path',
          name: 'id',
          required: true,
          schema: { type: 'integer' },
          description: 'Leave request ID.'
        }
      },
      responses: {
        Unauthorized: {
          description: 'Not signed in, or the session has expired.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
        },
        Forbidden: {
          description: "The signed-in user's role cannot perform this action.",
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
        },
        NotFound: {
          description: 'No matching record.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: { error: { type: 'string' } }
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['staff', 'hod', 'hr', 'principal'] },
            title: { type: 'string' },
            initials: { type: 'string' },
            department: {
              type: 'object',
              nullable: true,
              properties: { id: { type: 'integer' }, name: { type: 'string' } }
            }
          }
        },
        LeaveType: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            key: { type: 'string', example: 'annual' },
            name: { type: 'string', example: 'Annual' },
            entitlementDays: { type: 'integer', nullable: true, description: 'null means case-by-case (e.g. Unpaid).' },
            approvalChain: { type: 'string', enum: ['hod_only', 'hod_then_hr'] },
            active: { type: 'boolean' },
            emoji: { type: 'string' },
            color: { type: 'string' },
            tint: { type: 'string' }
          }
        },
        LeaveRequest: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' },
            days: { type: 'integer' },
            reason: { type: 'string' },
            status: { type: 'string', enum: ['pending_hod', 'pending_hr', 'approved', 'declined'] },
            createdAt: { type: 'string', format: 'date-time' },
            submittedAt: { type: 'string', format: 'date-time' },
            staff: {
              type: 'object',
              properties: { id: { type: 'integer' }, name: { type: 'string' }, initials: { type: 'string' } }
            },
            department: {
              type: 'object',
              nullable: true,
              properties: { id: { type: 'integer' }, name: { type: 'string' }, hodName: { type: 'string', nullable: true } }
            },
            leaveType: { $ref: '#/components/schemas/LeaveType' },
            balanceRemaining: { type: 'integer', nullable: true, description: "Staff member's current remaining balance for this leave type/year." },
            balanceAfterDecision: { type: 'integer', nullable: true, description: 'balanceRemaining minus this request\'s days.' }
          }
        },
        Approval: {
          type: 'object',
          properties: {
            step: { type: 'string', enum: ['hod', 'hr'] },
            decision: { type: 'string', enum: ['approved', 'declined'] },
            note: { type: 'string' },
            decidedAt: { type: 'string', format: 'date-time' },
            approverName: { type: 'string' }
          }
        },
        DecisionResult: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['pending_hr', 'approved', 'declined'] },
            staffFirstName: { type: 'string' },
            typeName: { type: 'string' }
          }
        },
        Balance: {
          type: 'object',
          properties: {
            key: { type: 'string' },
            name: { type: 'string' },
            emoji: { type: 'string' },
            color: { type: 'string' },
            tint: { type: 'string' },
            entitlement: { type: 'integer' },
            used: { type: 'integer' },
            remaining: { type: 'integer' }
          }
        },
        StaffBalanceRow: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            initials: { type: 'string' },
            department: { type: 'string' },
            annual: { type: 'string', example: '22 / 30' },
            sick: { type: 'string', example: '13 / 15' },
            casual: { type: 'string', example: '4 / 7' },
            study: { type: 'string', example: '15 / 20' }
          }
        },
        Organisation: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            leaveYearStartMonth: { type: 'string', example: 'January' }
          }
        },
        Insights: {
          type: 'object',
          properties: {
            statCards: {
              type: 'array',
              items: {
                type: 'object',
                properties: { label: { type: 'string' }, value: { type: 'string' }, delta: { type: 'string' } }
              }
            },
            monthBars: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  label: { type: 'string', example: 'Jan' },
                  value: { type: 'integer' },
                  pct: { type: 'integer' },
                  current: { type: 'boolean' }
                }
              }
            },
            deptBars: {
              type: 'array',
              items: {
                type: 'object',
                properties: { name: { type: 'string' }, value: { type: 'integer' }, pct: { type: 'integer' } }
              }
            },
            coverageAlert: { type: 'string' }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.js', './src/index.js']
});

export default spec;
