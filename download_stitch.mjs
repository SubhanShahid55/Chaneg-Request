import fs from 'fs';
import path from 'path';

const downloads = [
  // 1. ChangeFlow - Agency Dashboard
  {
    name: '01_agency_dashboard',
    screenId: '26c687de893147ef9f527e4e9e4c2bef',
    screenshotUrl: 'https://lh3.googleusercontent.com/aida/AEtjO1UPYHYKBBz0XFvp4ucAnkopo6Z_ZjQ6ldpFktrY5Zb8gvkZ4gRDTxCsXrY2aALlUtKjElkCv_eU_q2i98X6YxFRVm7gTgs9a3-bDP_KgcYNzOSJ8nn_e18LDl9vVQKNThk09pZZGrw93FdsLxANcJZxgaF1F4-STTgrFfyFbrbrOWS-JAr5Sk5u2wV6tt7ytfayLze6HFLsmnyBZCN74ZzTSQxQVTYTysMsfAyA2FGiVgTrj0ZmCNyxBQE',
    codeUrl: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzAwMDY1YWRkMmQ1MDBkODEwM2IxODIzMDM3MGNiZDM1EgsSBxCe442LxhYYAZIBJAoKcHJvamVjdF9pZBIWQhQxODA3NTg3OTE5ODA4MDIzNDU5Mw&filename=&opi=89354086',
    codeExt: '.html'
  },
  // 2. ChangeFlow Logo
  {
    name: '02_changeflow_logo',
    screenId: '3113ab34455c4d1caeb4f1e51b39798c',
    screenshotUrl: 'https://lh3.googleusercontent.com/aida/AEtjO1Vz3nG3CJDn5GLaQNSV_kwBlJXHbd3jnFuLG1W2chHjIwYyP6Ln95TuZbsqfpGoYNSfTA7BmT6J9uhn9eZIPU3uPVAnUtbeGNYUnjGZvukWi8eYtLEDfuEHJS7fh-4R1cVFEKkKjvrl-sQxMrr-DKB1X0TcrRhfQjxyEnXrj2Qe8SLnc6S3dEvY2FWH4TV2PPQ4c5HW3zKdT7oEorNfeEHGwcw2_CbkAvU259fBN5H08p0f-nM1biIev84g',
    codeUrl: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzAwMDY1YWRkMjczNzc3NDkwNDc5ZjI3ODdkMTY4ZDQzEgsSBxCe442LxhYYAZIBJAoKcHJvamVjdF9pZBIWQhQxODA3NTg3OTE5ODA4MDIzNDU5Mw&filename=&opi=89354086',
    codeExt: '.svg'
  },
  // 3. Change Request Tracker Spec
  {
    name: '03_tracker_spec',
    screenId: '37442d1c0abc4d96af7dee0ce5a70be7',
    codeUrl: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzAwMDY1YWRkMWY4NzQ3NmMwM2IxODIzMDM3MGNiZDM1EgsSBxCe442LxhYYAZIBJAoKcHJvamVjdF9pZBIWQhQxODA3NTg3OTE5ODA4MDIzNDU5Mw&filename=&opi=89354086',
    codeExt: '.md'
  },
  // 4. Professional headshot
  {
    name: '04_headshot_pm',
    screenId: 'a9799f75e9c04f0faae9a363180147f6',
    screenshotUrl: 'https://lh3.googleusercontent.com/aida/AEtjO1UujTePDLjE10YYR_SjSda5wyP4ZGVD4uWhZnWxv-wCVB2jWb6AF8t2fOxD08lUuBl5hp13m9qPpPAOLQ4byzJccw6t2lqiVuWTXIDGQ5dlVTg9Ehisy7mV9_oBkXr8jSwVGh6C-eKMRM3cytvminajDCg7qhWBcNuI4QT7BWWCKNoYtB0PHtxhs71TCHJEwGRLtpxuTozj2tzSFc1Qv3SgPzO3bM23qd2Tv8FFO6OvqzMRO5bsmXzs_z0l',
    codeExt: null
  },
  // 6. ChangeFlow - Agency Sign In
  {
    name: '06_agency_signin',
    screenId: 'd8aa3efddaa04accb722404214b3b34e',
    screenshotUrl: 'https://lh3.googleusercontent.com/aida/AEtjO1WBYUgZNxnOF47h_C-bd-ODDKRiHYlegR63I_5OHs1ePJxDPH3EOYeornENtAG3C-1oXoCHK7DF3KbLnqVWafGf1Nms-mmKu_6NmpfZTsEhYQ0swMVtfJOyELxdpfK49eCV2dc8SMTjSz4jQ-59_4YbPUv4ZO1SR3OdugfvsbpeM-T1ymDtPISkK3LSvOQvkDSPE6pHzlKD3A0nX1g0qnEBA3KY-GH6pk5XrR6Qx1g6Ep9OV_X4y08wKpaG',
    codeUrl: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzAwMDY1YWRkMjkzOTNjOTUwOTY4OGZjNDQwMTcyNTIwEgsSBxCe442LxhYYAZIBJAoKcHJvamVjdF9pZBIWQhQxODA3NTg3OTE5ODA4MDIzNDU5Mw&filename=&opi=89354086',
    codeExt: '.html'
  },
  // 7. ChangeFlow - Request Detail & Scope Estimate
  {
    name: '07_request_detail',
    screenId: 'e929c60de3314501b17f277e0be728be',
    screenshotUrl: 'https://lh3.googleusercontent.com/aida/AEtjO1VkKRJ5toWM3w0pko0SPv0x07d-dSWZr1xNWQmb_9bjNPNbjbEXcIevEKC0uvizSm7Wxudv41FFZ8xB-qYOMrFpnq5W3Mwpz_glKIXLUHtUYJ6q5vM7Z1aVwxp5NHEVQR0uYiN8aHysCM_ltMMJ0nJgAyag1a6dt-VklDA0tlwne6d7JEq3GoAUw4Mj73VgFlrxK6HUZy-PsALZgUYBOE_79x6ayjnDGoWi5wV5zdtWsimpdHcxQY5ZpoHU',
    codeUrl: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzAwMDY1YWRkMmFiMTAyYzEwMjNiZjk3MTIzMjVmYTlhEgsSBxCe442LxhYYAZIBJAoKcHJvamVjdF9pZBIWQhQxODA3NTg3OTE5ODA4MDIzNDU5Mw&filename=&opi=89354086',
    codeExt: '.html'
  },
  // 8. ChangeFlow - Client Approval (Mobile)
  {
    name: '08_client_approval_mobile',
    screenId: '2a346e29652c4e8c9aa8d2a419fabc9f',
    screenshotUrl: 'https://lh3.googleusercontent.com/aida/AEtjO1Uf6bD6qdYrve7FIog2xOzOgZwYFE-SbZGI1hl-P6ov7tO3FoV2Pjt9L-lY9EtytUalCZUQdWOeh231GMQXv0z_nHnv_3YgrDdRc89-yR7TkrujBx9rp2uZq_qLgeeJGA_K3bd_O2Ci07saUYWRBjOOrtED36PiS1AJiUCFykTskE0GzEfO6FbhSyazeXmDVVM9hdm_wIKeCNVsDGGkC8OsikwmA4UMQoFTp2ChHrS5aq9ILWdWmvjrjh8',
    codeUrl: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzAwMDY1YWU1MDcyMWRlOWUwMjNiZjk3MTIzMjVmYTlhEgsSBxCe442LxhYYAZIBJAoKcHJvamVjdF9pZBIWQhQxODA3NTg3OTE5ODA4MDIzNDU5Mw&filename=&opi=89354086',
    codeExt: '.html'
  },
  // 9. ChangeFlow - Dashboard with New Request Slide-over Panel
  {
    name: '09_dashboard_slideover',
    screenId: '26dbecd343d243a3bed898d3ebcfd5cb',
    screenshotUrl: 'https://lh3.googleusercontent.com/aida/AEtjO1VMnkcVxdIEInMctSxuCWttyowSvkKpP1uJzKqiwaW7tLsv4FqLqo8gExVw0ULKv-WDVSJ-eCbbqzdfkDjSuN_uDbxZ5arKbBeXIegeo4bWpg4fpfICeb16rGHcf6ivss-hqHaJ_ZFtKke1v18S03ebliOkEZCrNVETaPUJYZpHPqz6r1q_QVFXOvyNRSLpuREQxjdAWba-NuFCdPX4MjWT55WNpV1D5WVgncjQv9DDlZCZeunHZ0zk4NzI',
    codeUrl: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzAwMDY1YWU1MThjYmZkMjcwNWYxMmIwN2FkMzk5ZDJkEgsSBxCe442LxhYYAZIBJAoKcHJvamVjdF9pZBIWQhQxODA3NTg3OTE5ODA4MDIzNDU5Mw&filename=&opi=89354086',
    codeExt: '.html'
  }
];

async function downloadAll() {
  for (const item of downloads) {
    if (item.screenshotUrl) {
      const dest = path.join('stitch_raw', 'screenshots', `${item.name}.png`);
      console.log(`Downloading screenshot: ${item.name} -> ${dest}`);
      const res = await fetch(item.screenshotUrl);
      const buf = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(dest, buf);
    }
    if (item.codeUrl) {
      const dest = path.join('stitch_raw', 'code', `${item.name}${item.codeExt}`);
      console.log(`Downloading code: ${item.name} -> ${dest}`);
      const res = await fetch(item.codeUrl);
      const text = await res.text();
      fs.writeFileSync(dest, text);
    }
  }
  console.log('All downloads complete!');
}

downloadAll().catch(err => {
  console.error('Error downloading:', err);
  process.exit(1);
});

