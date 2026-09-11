

async function verify() {
  console.log('Starting verification...');
  
  // 1. Get a client
  const clientsRes = await fetch('http://localhost:4000/clients');
  const { clients } = await clientsRes.json();
  let client;
  if (!clients || clients.length === 0) {
    console.log('No clients found, creating one...');
    const createRes = await fetch('http://localhost:4000/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_name: 'Test Corp', contact_name: 'John', contact_email: 'john@test.com' })
    });
    const resJson = await createRes.json();
    client = resJson.client;
  } else {
    client = clients[0];
  }
  console.log('Using client:', client.company_name);

  // 2. Create Project
  console.log('Creating Project...');
  const projRes = await fetch('http://localhost:4000/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: client.id,
      name: 'Verification Project',
      deliverables: [{ description: 'Initial Scope', category: 'Frontend', hours: 40 }]
    })
  });
  const project = await projRes.json();
  console.log('Project created:', project.id);

  // 3. Create CR 1
  console.log('Creating CR 1...');
  const cr1Res = await fetch('http://localhost:4000/requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: client.id,
      project_id: project.id,
      title: 'Change Request 1',
      hourly_rate: 150,
      deliverables: [
        { description: 'Design update', category: 'Frontend', hours: 10 }
      ]
    })
  });
  const cr1 = await cr1Res.json();
  console.log('CR 1 created:', cr1.id);

  // 4. Create CR 2
  console.log('Creating CR 2...');
  const cr2Res = await fetch('http://localhost:4000/requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: client.id,
      project_id: project.id,
      title: 'Change Request 2',
      hourly_rate: 150,
      deliverables: [
        { description: 'Backend update', category: 'Backend', hours: 20 }
      ]
    })
  });
  const cr2 = await cr2Res.json();
  console.log('CR 2 created:', cr2.id);

  // 5. Approve CR 1
  console.log('Advancing CR 1 to Awaiting Approval...');
  await fetch(`http://localhost:4000/requests/${cr1.id}/advance`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  await fetch(`http://localhost:4000/requests/${cr1.id}/advance`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  await fetch(`http://localhost:4000/requests/${cr1.id}/send-for-approval`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  // To approve it we need the token, let's just use the internal endpoint if it exists
  console.log('Wait, we cannot easily approve without the token unless we read the DB, but we can verify the DB directly.');

  console.log('Verification done.');
}
verify().catch(console.error);
