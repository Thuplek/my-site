// Marcos Fellipe Watanabe — Personal Site
// React app with bilingual content, scroll reveals, hero variants

const { useState, useEffect, useRef, useMemo } = React;

const HERO_VARIANT = "centered";
const ACCENT_COLOR = "#ff5c3a";
const SHOW_3D = true;
const SHOW_TYPEWRITER = true;

// ============================================
// Reveal hook
// ============================================
function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

function Reveal({ children, stagger = false, as = "div", className = "", ...rest }) {
  const ref = useReveal();
  const Tag = as;
  return (
    <Tag ref={ref} className={`${stagger ? "reveal-stagger" : "reveal"} ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

// ============================================
// Typewriter
// ============================================
function Typewriter({ words }) {
  const [text, setText] = useState("");
  const [i, setI] = useState(0);
  const [del, setDel] = useState(false);
  useEffect(() => {
    const w = words[i % words.length];
    const speed = del ? 35 : 70;
    const t = setTimeout(() => {
      if (!del) {
        if (text.length < w.length) setText(w.slice(0, text.length + 1));
        else setTimeout(() => setDel(true), 1400);
      } else {
        if (text.length > 0) setText(w.slice(0, text.length - 1));
        else { setDel(false); setI(i + 1); }
      }
    }, speed);
    return () => clearTimeout(t);
  }, [text, del, i, words]);
  return <div className="typewriter">{text}<span className="cursor">▍</span></div>;
}

// ============================================
// Scramble name — hover swaps to nickname with letter scramble
// ============================================
function ScrambleName({ primary, alt }) {
  const [text, setText] = useState(primary);
  const targetRef = useRef(primary);
  const rafRef = useRef(null);

  function scrambleTo(target) {
    if (target === targetRef.current) return;
    targetRef.current = target;
    // Swap the 3D background to gaming mode when revealing the alt name
    if (window.__scene3d && window.__scene3d.setMode) {
      window.__scene3d.setMode(target === alt ? "games" : "tech");
    }
    if (rafRef.current) clearInterval(rafRef.current);

    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%&*<>/?";
    const from = text;
    const to = target;
    const len = Math.max(from.length, to.length);
    const queue = [];
    for (let i = 0; i < len; i++) {
      const f = from[i] || "";
      const tCh = to[i] || "";
      const start = Math.floor(Math.random() * 10);
      const end = start + 8 + Math.floor(Math.random() * 12);
      queue.push({ f, tCh, start, end });
    }
    let frame = 0;
    rafRef.current = setInterval(() => {
      let out = "";
      let complete = 0;
      for (let i = 0; i < queue.length; i++) {
        const { f, tCh, start, end } = queue[i];
        if (frame >= end) { out += tCh; complete++; }
        else if (frame >= start) {
          if (tCh === " " || tCh === "\n") { out += tCh; }
          else if (tCh === ".") { out += Math.random() < 0.5 ? tCh : chars[Math.floor(Math.random() * chars.length)]; }
          else { out += chars[Math.floor(Math.random() * chars.length)]; }
        }
        else out += f;
      }
      setText(out);
      frame++;
      if (complete === queue.length) {
        clearInterval(rafRef.current);
        rafRef.current = null;
        setText(target);
      }
    }, 38);
  }

  useEffect(() => () => { if (rafRef.current) clearInterval(rafRef.current); }, []);
  useEffect(() => { if (text === targetRef.current && targetRef.current !== primary) { /* keep */ } else if (targetRef.current === primary) setText(primary); }, [primary]);

  return (
    <div
      className="hero-name-wrap"
      onMouseEnter={() => scrambleTo(alt)}
      onMouseLeave={() => scrambleTo(primary)}
      onTouchStart={() => scrambleTo(targetRef.current === primary ? alt : primary)}
      title="hover"
    >
      {/* Invisible sizers lock the container to the larger of the two states
          so the visible h1 doesn't wobble during scramble */}
      <span aria-hidden="true" className="hero-name hero-name-sizer">{primary}</span>
      <span aria-hidden="true" className="hero-name hero-name-sizer">{alt}</span>
      <h1 className="hero-name hero-name-live">{text}</h1>
    </div>
  );
}

// ============================================
// Nav
// ============================================
function Nav({ t, lang, setLang }) {
  return (
    <nav className="nav">
      <div className="nav-brand"><b>thuplek</b> · /portfolio</div>
      <div className="nav-links">
        <a className="nav-link" href="#about">{t.nav.about}</a>
        <a className="nav-link" href="#experience">{t.nav.experience}</a>
        <a className="nav-link" href="#skills">{t.nav.skills}</a>
        <a className="nav-link" href="#education">{t.nav.education}</a>
        <a className="nav-link" href="#contact">{t.nav.contact}</a>
      </div>
      <div className="nav-lang">
        <button className={lang === "pt" ? "active" : ""} onClick={() => setLang("pt")}>PT</button>
        <button className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>EN</button>
      </div>
    </nav>
  );
}

// ============================================
// Hero variants
// ============================================
function HeroContent({ t, showTypewriter }) {
  return (
    <>
      <div className="hero-eyebrow">
        <span className="dot"></span>
        {t.hero.eyebrow}
      </div>
      <div className="hero-handle">
        {t.hero.handle}
        <span className="hint">{t.hero.hoverHint}</span>
      </div>
      <ScrambleName primary={t.hero.name} alt={t.hero.altName} />
      <div className="hero-role"><b>{"//"}</b> {t.hero.role}</div>
      {showTypewriter && <Typewriter words={t.hero.typewriter} />}
    </>
  );
}

function HeroCentered({ t, showTypewriter }) {
  return (
    <Reveal stagger className="hero" data-variant="centered">
      <HeroContent t={t} showTypewriter={showTypewriter} />
      <p className="hero-tagline">{t.hero.tagline}</p>
      <div className="hero-ctas">
        <a href="#experience" className="btn btn-primary">{t.hero.ctaPrimary} <span className="arrow">→</span></a>
        <a href="#contact" className="btn">{t.hero.ctaSecondary}</a>
      </div>
      <div className="hero-stats">
        {t.hero.stats.map((s, i) => (
          <div className="hero-stat" key={i}>
            <div className="hero-stat-val">{s.value}</div>
            <div className="hero-stat-label">{s.label}</div>
          </div>
        ))}
      </div>
    </Reveal>
  );
}

function HeroSplit({ t, showTypewriter }) {
  return (
    <div className="hero" data-variant="split">
      <Reveal stagger>
        <HeroContent t={t} showTypewriter={showTypewriter} />
        <p className="hero-tagline">{t.hero.tagline}</p>
        <div className="hero-ctas">
          <a href="#experience" className="btn btn-primary">{t.hero.ctaPrimary} <span className="arrow">→</span></a>
          <a href="#contact" className="btn">{t.hero.ctaSecondary}</a>
        </div>
      </Reveal>
      <div className="hero-3d-slot">
        <Reveal>
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "32px"
          }}>
            <div className="hero-stats" style={{ marginTop: 0, borderTop: "none", paddingTop: 0 }}>
              {t.hero.stats.map((s, i) => (
                <div className="hero-stat" key={i}>
                  <div className="hero-stat-val">{s.value}</div>
                  <div className="hero-stat-label">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

function HeroOverlay({ t, showTypewriter }) {
  return (
    <div className="hero" data-variant="overlay" style={{ position: "relative" }}>
      <Reveal stagger className="hero-card">
        <HeroContent t={t} showTypewriter={showTypewriter} />
        <div className="hero-ctas" style={{ marginTop: 28 }}>
          <a href="#experience" className="btn btn-primary">{t.hero.ctaPrimary} <span className="arrow">→</span></a>
          <a href="#contact" className="btn">{t.hero.ctaSecondary}</a>
        </div>
      </Reveal>
      <Reveal className="hero-tagline-card">
        {t.hero.tagline}
      </Reveal>
      <Reveal className="hero-stats-card">
        {t.hero.stats.map((s, i) => (
          <div className="hero-stat" key={i}>
            <div className="hero-stat-val">{s.value}</div>
            <div className="hero-stat-label">{s.label}</div>
          </div>
        ))}
      </Reveal>
    </div>
  );
}

// ============================================
// Sections
// ============================================
function About({ t }) {
  return (
    <section id="about">
      <Reveal as="div" className="sec-label">{t.about.label}</Reveal>
      <Reveal as="h2" className="sec-title">{t.about.title}</Reveal>
      <div className="about-grid">
        <Reveal stagger className="about-body">
          {t.about.body.map((p, i) => <p key={i}>{p}</p>)}
        </Reveal>
        <Reveal className="glass about-facts">
          {t.about.facts.map((f, i) => (
            <div className="about-fact" key={i}>
              <span className="k">{f.k}</span>
              <span className="v">{f.v}</span>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

function Experience({ t }) {
  return (
    <section id="experience">
      <Reveal as="div" className="sec-label">{t.experience.label}</Reveal>
      <Reveal as="h2" className="sec-title">{t.experience.title}</Reveal>
      <div className="timeline">
        {t.experience.items.map((it, i) => (
          <Reveal key={i} className="exp">
            <div className="exp-head">
              <h3 className="exp-company">{it.company}</h3>
              <span className="exp-period">{it.period}</span>
            </div>
            <div className="exp-role">{it.role}</div>
            <div className="exp-location">{it.location}</div>
            <div className="glass exp-card">
              <ul>{it.bullets.map((b, j) => <li key={j}>{b}</li>)}</ul>
              <div className="exp-tags">
                {it.tags.map((tag, j) => <span className="tag" key={j}>{tag}</span>)}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Marquee({ items }) {
  const seq = [...items, ...items];
  return (
    <div className="marquee">
      <div className="marquee-track">
        {seq.map((it, i) => <div className="marquee-item" key={i}>{it}</div>)}
      </div>
    </div>
  );
}

function Skills({ t }) {
  const all = t.skills.groups.flatMap(g => g.items);
  return (
    <section id="skills">
      <Reveal as="div" className="sec-label">{t.skills.label}</Reveal>
      <Reveal as="h2" className="sec-title">{t.skills.title}</Reveal>
      <Reveal stagger className="skills-grid">
        {t.skills.groups.map((g, i) => (
          <div className={`glass skill-group${g.muted ? " skill-group-muted" : ""}`} key={i}>
            <h3>{g.title}</h3>
            <ul>{g.items.map((s, j) => <li key={j}>{s}</li>)}</ul>
          </div>
        ))}
      </Reveal>
      <Marquee items={all} />
    </section>
  );
}

function Education({ t }) {
  return (
    <section id="education">
      <Reveal as="div" className="sec-label">{t.education.label}</Reveal>
      <Reveal as="h2" className="sec-title">{t.education.title}</Reveal>
      <Reveal stagger className="edu-list">
        {t.education.items.map((it, i) => (
          <div className="glass edu-card" key={i}>
            <div className="edu-head">
              <h3 className="edu-course">{it.course}</h3>
              <span className="edu-period">{it.period}</span>
            </div>
            <div className="edu-inst">{it.institution}</div>
            <p>{it.desc}</p>
          </div>
        ))}
      </Reveal>
    </section>
  );
}

function Projects({ t }) {
  return (
    <section id="projects">
      <Reveal as="div" className="sec-label">{t.projects.label}</Reveal>
      <Reveal as="h2" className="sec-title">{t.projects.title}</Reveal>
      <Reveal stagger className="projects-grid">
        {t.projects.items.map((p, i) => (
          <div className="glass project-card" key={i}>
            <div className="project-mark">◆</div>
            <div className="project-subtitle">{p.subtitle}</div>
            <h3 className="project-name">{p.name}</h3>
            <p className="project-desc">{p.desc}</p>
            <div className="exp-tags" style={{ marginTop: 18, paddingTop: 18 }}>
              {p.tags.map((tag, j) => <span className="tag" key={j}>{tag}</span>)}
            </div>
          </div>
        ))}
      </Reveal>
    </section>
  );
}

function AdSection({ t }) {
  const [visible, setVisible] = useState(false);
  const insRef = useRef(null);

  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {}

    const ins = insRef.current;
    if (!ins) return;

    const check = () => {
      if (ins.getAttribute("data-ad-status") === "filled") setVisible(true);
    };

    const observer = new MutationObserver(check);
    observer.observe(ins, { attributes: true, attributeFilter: ["data-ad-status"] });
    check();

    return () => observer.disconnect();
  }, []);

  return (
    <section id="ad" className="ad-section" style={{display: visible ? "" : "none"}}>
      <Reveal>
        <div className="ad-inner">
          <div className="ad-meta">
            <span className="ad-chip">{t.ad.chip}</span>
            <h3 className="ad-heading">{t.ad.heading}</h3>
            <p className="ad-note">{t.ad.note}</p>
          </div>
          <div className="ad-slot">
            <ins ref={insRef}
                 className="adsbygoogle"
                 style={{display: "block"}}
                 data-ad-client="ca-pub-5792705858000224"
                 data-ad-slot="8984824177"
                 data-ad-format="auto"
                 data-full-width-responsive="true"></ins>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function Contact({ t }) {
  return (
    <section id="contact" className="contact">
      <Reveal stagger className="glass contact-card">
        <div className="sec-label" style={{ marginBottom: 0 }}>{t.contact.label}</div>
        <h2 className="sec-title" style={{ marginBottom: 0 }}>{t.contact.title}</h2>
        <p>{t.contact.body}</p>
        <div className="contact-channels">
          {t.contact.channels.map((c, i) => (
            <a key={i} className="contact-chan" href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noopener">
              <span className="k">{c.k}</span>
              <span className="v">{c.v}</span>
            </a>
          ))}
        </div>
        <a href={t.contact.link} target="_blank" rel="noopener" className="btn btn-primary">
          {t.contact.cta} <span className="arrow">↗</span>
        </a>
      </Reveal>
    </section>
  );
}

// ============================================
// Cursor follower
// ============================================
function CursorDot() {
  const ref = useRef(null);
  useEffect(() => {
    const dot = ref.current;
    if (!dot) return;
    let x = 0, y = 0, tx = 0, ty = 0;
    function move(e) { tx = e.clientX; ty = e.clientY; }
    function loop() {
      x += (tx - x) * 0.18;
      y += (ty - y) * 0.18;
      dot.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      requestAnimationFrame(loop);
    }
    function over(e) {
      const tgt = e.target;
      if (tgt.closest && tgt.closest("a, button, .btn")) dot.classList.add("hover");
      else dot.classList.remove("hover");
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerover", over);
    loop();
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerover", over);
    };
  }, []);
  return <div className="cursor-dot" ref={ref}></div>;
}

// ============================================
// App
// ============================================
function App() {
  const [lang, setLang] = useState("pt");

  const t = window.SITE_DATA[lang] || window.SITE_DATA.pt;

  useEffect(() => {
    document.documentElement.style.setProperty("--accent", ACCENT_COLOR);
  }, []);

  useEffect(() => {
    if (window.__scene3d) window.__scene3d.setLayout(HERO_VARIANT);
    const canvas = document.getElementById("scene3d");
    if (canvas) canvas.style.display = SHOW_3D ? "block" : "none";
  }, []);

  const HeroComp =
    HERO_VARIANT === "split" ? HeroSplit :
    HERO_VARIANT === "overlay" ? HeroOverlay :
    HeroCentered;

  return (
    <>
      <CursorDot />
      <Nav t={t} lang={lang} setLang={setLang} />
      <div className="site">
        <HeroComp t={t} showTypewriter={SHOW_TYPEWRITER} />
        <About t={t} />
        <Experience t={t} />
        <Skills t={t} />
        <Education t={t} />
        <Projects t={t} />
        <Contact t={t} />
        <AdSection t={t} />
        <footer className="footer">{t.footer}</footer>
      </div>
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
