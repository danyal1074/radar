async function testLoginCookie() {
  const fd = new FormData();
  fd.append('email', 'admin@radar.ir');
  fd.append('password', 'danyal1074');
  
  // Call server action on Next.js
  const res = await fetch('http://localhost:3000/login', {
    method: 'POST',
    headers: {
      'Next-Action': '607b5465a06c90ef64aa98f2460b9222d8afd76ed4', // or whatever action id
    },
    body: fd,
    redirect: 'manual'
  });
  console.log('Action status:', res.status);
  console.log('Set-Cookie headers:', res.headers.getSetCookie?.() || res.headers.get('set-cookie'));
}
testLoginCookie();
