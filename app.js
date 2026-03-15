// mobile menu
const burger = document.getElementById("burger");
const navLinks = document.getElementById("navLinks");
burger?.addEventListener("click", () => navLinks.classList.toggle("open"));

// year
document.getElementById("year").textContent = new Date().getFullYear();

// FAQ accordion
document.querySelectorAll("[data-faq]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const ans = btn.nextElementSibling;
    const icon = btn.querySelector("i");
    const isOpen = ans.classList.contains("open");

    // close all
    document.querySelectorAll(".faq-a").forEach(a => a.classList.remove("open"));
    document.querySelectorAll(".faq-q i").forEach(i => i.textContent = "+");

    // open current
    if (!isOpen) {
      ans.classList.add("open");
      icon.textContent = "–";
    }
  });
});

// reveal on scroll
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) e.target.classList.add("show");
  });
},{threshold:0.14});

document.querySelectorAll(".reveal").forEach(el => io.observe(el));
// Login: toggle password (safe — only runs if elements exist)
const pwd = document.getElementById("pwd");
const togglePwd = document.getElementById("togglePwd");
if (pwd && togglePwd) {
  togglePwd.addEventListener("click", () => {
    const isPwd = pwd.type === "password";
    pwd.type = isPwd ? "text" : "password";
    togglePwd.textContent = isPwd ? "🙈" : "👁";
  });
}
