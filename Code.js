// function myFunction() {
//       /***** CONFIG *****/
//     const CONFIG = {
//       // Sheet & columns
//       FORM_SHEET_NAME: 'Form Responses 1',           // where new rows land
//       COL_EMAIL: 'Email Address',                    // exact header text
//       COL_TEAM: 'Team',                              // exact header text
//       // OPTIONAL: if you prefer deriving Team Group from a lookup tab, set LOOKUP below
//       LOOKUP: {
//         ENABLED: true,                               // true = use LocationLookup tab; false = use TEAM_GROUP_FORMAT
//         SHEET_NAME: 'LocationLookup',                // tab with mapping
//         KEY_COL_HEADER: 'Team',                      // column header in LocationLookup to match Team value
//         GROUP_EMAIL_COL_HEADER: 'Team Group Email'   // column header in LocationLookup that holds the group email
//       },

//       // Groups
//       ALL_MEMBER_GROUP_EMAIL: 'all-members@friendsofportlandnet.org',

//       // If not using LOOKUP, we’ll build team group email from a pattern:
//       TEAM_GROUP_FORMAT: ({ team }) =>
//         `team-${slugify(team)}@YOUR-DOMAIN.org`,

//       // Run mode
//       DRY_RUN: false, // set true to test without adding members
//     };
//     /***** END CONFIG *****/


//     /** UTIL: Slugify for team → email */
//     function slugify(s) {
//       return String(s || '')
//         .toLowerCase()
//         .normalize('NFKD')
//         .replace(/[\u0300-\u036f]/g, '') // accents
//         .replace(/[^a-z0-9]+/g, '-')
//         .replace(/^-+|-+$/g, '');
//     }

//     /** Entrypoint for installable trigger: on form submit */
//     function onFormSubmit(e) {
//       try {
//         if (!e || !e.range || !e.namedValues) {
//           throw new Error('onFormSubmit requires an installable trigger (Edit → Current project’s triggers).');
//         }
//         const rowObj = buildRowObjectFromNamedValues(e.namedValues);
//         processMember(rowObj);
//       } catch (err) {
//         console.error('onFormSubmit error:', err);
//       }
//     }

//     /** Manual backfill: processes every row in FORM_SHEET_NAME */
//     function syncAllRows() {
//       const sheet = getSheet_(CONFIG.FORM_SHEET_NAME);
//       const { headers, rows } = readSheet_(sheet);
//       rows.forEach(r => {
//         const rowObj = mapRow_(headers, r);
//         processMember(rowObj);
//       });
//       Logger.log('syncAllRows complete');
//     }

//     /** Core: add person to All‑Member + Team group (idempotent) */
//     function processMember(row) {
//       console.log('processMember')
//       const email = (row[CONFIG.COL_EMAIL] || '').trim();
//       const team = (row[CONFIG.COL_TEAM] || '').trim();

//       if (!email || !/@/.test(email)) {
//         Logger.log(`SKIP: invalid/missing email. Row: ${JSON.stringify(row)}`);
//         return;
//       }

//       // 1) All‑Member group
//       addToGroupIdempotent_(CONFIG.ALL_MEMBER_GROUP_EMAIL, email);

//       // 2) Team group
//       const teamGroupEmail = resolveTeamGroupEmail_(team);
//       if (!teamGroupEmail) {
//         Logger.log(`SKIP team group: cannot resolve for team="${team}" email="${email}"`);
//         return;
//       }
//       addToGroupIdempotent_(teamGroupEmail, email);
//     }

//     /** Resolve team group email via lookup tab or format */
//     function resolveTeamGroupEmail_(team) {
//       if (!team) return null;

//       if (CONFIG.LOOKUP.ENABLED) {
//         const sheet = getSheet_(CONFIG.LOOKUP.SHEET_NAME);
//         const { headers, rows } = readSheet_(sheet);
//         const keyIdx = headers.indexOf(CONFIG.LOOKUP.KEY_COL_HEADER);
//         const grpIdx = headers.indexOf(CONFIG.LOOKUP.GROUP_EMAIL_COL_HEADER);
//         if (keyIdx === -1 || grpIdx === -1) {
//           throw new Error(`LocationLookup must have headers "${CONFIG.LOOKUP.KEY_COL_HEADER}" and "${CONFIG.LOOKUP.GROUP_EMAIL_COL_HEADER}"`);
//         }
//         for (const r of rows) {
//           if (String(r[keyIdx]).trim() === team) {
//             const g = String(r[grpIdx] || '').trim();
//             return g || null;
//           }
//         }
//         return null;
//       } else {
//         return CONFIG.TEAM_GROUP_FORMAT({ team });
//       }
//     }



//     /** Helpers: sheet I/O */
//     function getSheet_(name) {
//       const sh = SpreadsheetApp.getActive().getSheetByName(name);
//       if (!sh) throw new Error(`Missing sheet tab: ${name}`);
//       return sh;
//     }



//     function buildRowObjectFromNamedValues(namedValues) {
//       // namedValues: {Header: [value]} – take first element
//       const obj = {};
//       Object.keys(namedValues).forEach(h => {
//         obj[h.trim()] = (namedValues[h] && namedValues[h][0] != null)
//           ? String(namedValues[h][0]).trim()
//           : '';
//       });
//       return obj;
//     }

//     function mapRow_(headers, rowArr) {
//       const obj = {};
//       headers.forEach((h, i) => obj[h] = rowArr[i]);
//       return obj;
//     }

//     /** Quick test utility */
//     function dryRunTrue() { CONFIG.DRY_RUN = true; }
//     function dryRunFalse() { CONFIG.DRY_RUN = false; }

//  }
