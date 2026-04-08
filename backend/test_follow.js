const http = require('http');

async function doFetch(path, method = 'GET', body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch('http://localhost:5000' + path, {
    method, headers, body: body ? JSON.stringify(body) : null
  });
  const data = await res.json().catch(e => ({}));
  return { status: res.status, data };
}

async function run() {
  console.log('1. Register Alice and Bob...');
  const aliceRes = await doFetch('/api/auth/register', 'POST', {
    name: 'Alice Private', handle: 'alice_' + Date.now(), email: 'alice' + Date.now() + '@test.com', password: 'password', isPrivate: true
  });
  const bobRes = await doFetch('/api/auth/register', 'POST', {
    name: 'Bob Public', handle: 'bob_' + Date.now(), email: 'bob' + Date.now() + '@test.com', password: 'password'
  });
  
  const tokenAlice = aliceRes.data.token;
  const aliceId = aliceRes.data._id;
  const tokenBob = bobRes.data.token;
  const bobId = bobRes.data._id;

  console.log('- Alice ID:', aliceId);
  console.log('- Bob ID:', bobId);

  console.log('\n2. Bob sends request to Alice...');
  const f1 = await doFetch('/api/auth/follow/' + aliceId, 'PUT', null, tokenBob);
  console.log('Bob->Alice Status:', f1.data.status); // should be 'pending'

  console.log('\n3. Alice checks requests...');
  const reqs = await doFetch('/api/auth/requests', 'GET', null, tokenAlice);
  console.log('Alice Requests:', reqs.data.map(r => r._id));

  console.log('\n4. Alice confirms request from Bob...');
  const confirm = await doFetch('/api/auth/confirm-request/' + bobId, 'PUT', null, tokenAlice);
  console.log('Confirm Response:', confirm.data.message);

  console.log('\n5. Check Relationships...');
  const bobFollowing = await doFetch('/api/auth/following/' + bobId, 'GET');
  console.log('Bob Following:', bobFollowing.data.map(f => f._id || f)); // Should include Alice
  
  const aliceFollowers = await doFetch('/api/auth/followers/' + aliceId, 'GET');
  console.log('Alice Followers:', aliceFollowers.data.map(f => f._id || f)); // Should include Bob
  
  console.log('\n6. Alice Follows Back Bob...');
  const f2 = await doFetch('/api/auth/follow/' + bobId, 'PUT', null, tokenAlice);
  console.log('Alice->Bob Status:', f2.data.status); // should be 'accepted' immediately

  console.log('\n7. Final Relationships...');
  const aliceFollowing = await doFetch('/api/auth/following/' + aliceId, 'GET');
  console.log('Alice Following:', aliceFollowing.data.map(f => f._id || f)); // Should include Bob
}

run().catch(console.error);
