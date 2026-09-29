import Image from "next/image";

/**
 * The two storytelling visuals of the homepage's "Who it is for" cards, composed from the site's own material so they
 * read without a photo shoot:
 *  - B2B — a designer's desk: a laptop running the 3D configurator, a clean technical elevation of the kitchen lying
 *    under it with a pencil, and a neat row of real decor samples in front — everything lies on the desk, nothing
 *    floats over the screen.
 *  - B2C — true AR: a phone held up in an EMPTY room (public/demo/empty-room.webp: bare wall, window, floor); the
 *    kitchen exists only in the viewfinder, standing on that same floor (public/demo/ar-screen.webp: a cut-out render
 *    of a real kitchen model from the configurator's own bundles, composited onto the empty room).
 * A real photograph replaces a composition as soon as it exists: public/home/b2b-story.webp, public/home/b2c-ar.webp
 * (see page.tsx `storyPhoto`). Decorative only (aria-hidden): the card's text carries the message.
 * Sizes are in container units, so each scene keeps its proportions in any card shape (styles in home.css).
 */

/** Real decors of the sample row: EGGER H1180 oak, W1000 white, U626 green, U999 black. */
const SAMPLES = [
  { key: "oak", fill: "#b58a5a", grain: true },
  { key: "white", fill: "#f1efe9" },
  { key: "green", fill: "#6c7a5c" },
  { key: "black", fill: "#2b2a28" },
];

/** A kitchen elevation in ink: wall units, worktop, base units with drawers, the oven, dimension lines. */
function Elevation() {
  const ink = "#2f3642";
  return (
    <svg className="hx-blueprint-svg" viewBox="0 0 400 290" preserveAspectRatio="xMidYMid meet">
      <g fill="none" stroke={ink} strokeWidth="1.3" strokeLinejoin="round">
        {/* wall units */}
        {[0, 1, 2, 3, 4].map((i) => (
          <rect key={`w${i}`} x={40 + i * 64} y={40} width={64} height={70} />
        ))}
        {/* backsplash + worktop */}
        <line x1="40" y1="160" x2="360" y2="160" strokeWidth="2" />
        <line x1="40" y1="166" x2="360" y2="166" />
        {/* base units: drawers, the oven, doors */}
        <rect x="40" y="166" width="64" height="84" />
        {[0, 1, 2].map((i) => (
          <line key={`d${i}`} x1="104" y1={166 + i * 28} x2="168" y2={166 + i * 28} />
        ))}
        <rect x="104" y="166" width="64" height="84" />
        <rect x="168" y="166" width="64" height="84" />
        <rect x="176" y="180" width="48" height="36" rx="2" />
        <rect x="232" y="166" width="64" height="84" />
        <rect x="296" y="166" width="64" height="84" />
        <line x1="40" y1="250" x2="360" y2="250" strokeWidth="2" />
      </g>
      {/* dimension lines (accent) */}
      <g stroke="#d9491f" strokeWidth="1" fill="#d9491f">
        <line x1="40" y1="272" x2="360" y2="272" />
        <line x1="40" y1="266" x2="40" y2="278" />
        <line x1="360" y1="266" x2="360" y2="278" />
        <line x1="378" y1="40" x2="378" y2="250" />
        <line x1="372" y1="40" x2="384" y2="40" />
        <line x1="372" y1="250" x2="384" y2="250" />
      </g>
      <g fill="#d9491f" fontFamily="ui-monospace, monospace" fontSize="11" textAnchor="middle">
        <text x="200" y="288">3200</text>
        <text x="392" y="150" transform="rotate(-90 392 150)">
          2100
        </text>
      </g>
      {/* title block */}
      <g stroke={ink} strokeWidth="1" fill="none">
        <rect x="40" y="10" width="96" height="18" />
        <line x1="88" y1="10" x2="88" y2="28" />
      </g>
    </svg>
  );
}

/** A story photo fills its card; `focus` keeps the subject in frame where the card crops it (phones: a 16:10 band). */
function StoryPhoto({ src, focus }: { src: string; focus: string }) {
  return <Image src={src} alt="" fill sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" style={{ objectPosition: focus }} />;
}

export function B2BStory({ photo }: { photo?: string | null }) {
  // the laptop sits at the top of the desk shot, the drawings below it
  if (photo) return <StoryPhoto src={photo} focus="50% 6%" />;
  return (
    <div className="hx-story hx-story--desk" aria-hidden>
      {/* the desk objects keep their arrangement on a fixed-proportion stage, centred in any card shape */}
      <div className="hx-story-stage">
        <div className="hx-blueprint">
          <Elevation />
        </div>
        <span className="hx-pencil" />
        <div className="hx-laptop">
          <div className="hx-laptop-screen">
            <Image src="/demo/kitchen-walnut.webp" alt="" fill sizes="(min-width: 1024px) 26vw, 64vw" className="object-cover" />
            {/* the configurator's own chrome, in miniature: the tool dock */}
            <span className="hx-laptop-dock">
              <i />
              <i />
              <i />
              <i className="is-on" />
              <i />
            </span>
          </div>
          <div className="hx-laptop-base" />
        </div>
        <div className="hx-swatches">
          {SAMPLES.map((s) => (
            <span key={s.key} className={s.grain ? "hx-swatch is-grain" : "hx-swatch"} style={{ backgroundColor: s.fill }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function B2CStory({ photo, arLabel }: { photo?: string | null; arLabel: string }) {
  // the phone is held left of centre
  if (photo) return <StoryPhoto src={photo} focus="30% 45%" />;
  return (
    <div className="hx-story hx-story--room" aria-hidden>
      {/* the visitor's own room — still empty — softly out of focus behind the phone */}
      <Image src="/demo/empty-room.webp" alt="" fill sizes="(min-width: 1024px) 40vw, 100vw" className="hx-story-room object-cover" />
      <div className="hx-phone">
        <div className="hx-phone-screen">
          {/* the same room through the camera, with the kitchen standing on its floor */}
          <Image src="/demo/ar-screen.webp" alt="" fill sizes="(min-width: 1024px) 14vw, 40vw" className="object-cover" style={{ objectPosition: "50% 100%" }} />
          <span className="hx-ar-brackets" />
          <span className="hx-ar-pill">{arLabel}</span>
          <span className="hx-ar-ring" />
          <span className="hx-ar-scale">1 : 1</span>
        </div>
      </div>
    </div>
  );
}
