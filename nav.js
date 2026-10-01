// nav.js - barra de navegación inferior con enlaces extra para administrador
// Debe cargarse DESPUÉS de que supabaseClient esté definido en la página.

(function () {
  const adminLinks = [
    { href: "aprobaciones.html", label: "✅ Aprobaciones" },
    { href: "usuarios.html", label: "👥 Usuarios" }
  ];

  const baseLinks = [
    { href: "index.html", label: "🏠 Inicio" },
    { href: "desafios.html", label: "🎯 Desafíos" },
    { href: "ranking.html", label: "🏆 Ranking" },
    { href: "panel.html", label: "👤 Perfil" }
  ];

  function currentPath() {
    const p = location.pathname.split("/").pop() || "index.html";
    return p;
  }

  function buildNav(isAdmin) {
    const nav = document.querySelector("nav.bottom-nav");
    if (!nav) return;

    // limpiar contenido actual
    nav.innerHTML = "";

    const links = isAdmin ? [...baseLinks, ...adminLinks] : baseLinks;
    const cur = currentPath();

    links.forEach(l => {
      const a = document.createElement("a");
      a.href = l.href;
      a.textContent = l.label;
      if (l.href === cur) a.classList.add("active");
      nav.appendChild(a);
    });

    // clase para manejo responsive cuando hay 6 enlaces
    if (links.length >= 6) nav.classList.add("has-six");
  }

  async function init() {
    // si no hay cliente supabase global, no hacemos nada
    if (typeof supabaseClient === "undefined") return;

    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) {
        buildNav(false);
        return;
      }

      const { data: profile } = await supabaseClient
        .from("usuario")
        .select("rol (nombre)")
        .eq("auth_id", user.id)
        .maybeSingle();

      const isAdmin = profile?.rol?.nombre === "Administrador";
      buildNav(isAdmin);
    } catch (e) {
      // en cualquier error, mostramos la nav básica de estudiante
      buildNav(false);
    }
  }

  // Esperar a que el DOM esté listo
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();