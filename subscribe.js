// Newsletter signup: posts to the Netlify function, which adds the contact in Brevo.
(function(){
  var form = document.getElementById('newsForm');
  if (!form) return;
  var msg = form.querySelector('.news-msg');
  var btn = form.querySelector('button');
  form.addEventListener('submit', function(e){
    e.preventDefault();
    msg.className = 'news-msg'; msg.textContent = '';
    btn.disabled = true;
    fetch('https://medpilot-subscribe.netlify.app/subscribe', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({email: form.email.value, website: form.website.value})
    }).then(function(r){ return r.json().catch(function(){ return {}; }).then(function(d){ return {ok: r.ok && d.ok, d: d}; }); })
      .then(function(res){
        if (res.ok) { form.reset(); msg.className = 'news-msg ok'; msg.textContent = "Thanks, you're subscribed."; }
        else { msg.className = 'news-msg err'; msg.textContent = res.d.error || 'Something went wrong. Please try again.'; }
      })
      .catch(function(){ msg.className = 'news-msg err'; msg.textContent = 'Could not connect. Please try again.'; })
      .finally(function(){ btn.disabled = false; });
  });
})();
