const menuToggle = document.getElementById('menuToggle');
const navLinks = document.getElementById('navLinks');
menuToggle.addEventListener('click', () => {
  const isOpen = navLinks.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
  menuToggle.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
});
navLinks.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  navLinks.classList.remove('open');
  menuToggle.setAttribute('aria-expanded', 'false');
}));

document.getElementById('year').textContent = new Date().getFullYear();

document.getElementById('contactForm').addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const subject = encodeURIComponent(`G-Operations enquiry: ${data.get('service')}`);
  const body = encodeURIComponent(
    `Name: ${data.get('name')}\nEmail: ${data.get('email')}\nService: ${data.get('service')}\n\nProject details:\n${data.get('details')}`
  );
  // Replace this placeholder with your real business email before publishing.
  const businessEmail = 'hello@g-operations.example';
  document.getElementById('formStatus').textContent =
    'Your email app will open with the enquiry prepared. Replace hello@g-operations.example in script.js with your real business email before going live.';
  window.location.href = `mailto:${businessEmail}?subject=${subject}&body=${body}`;
});
