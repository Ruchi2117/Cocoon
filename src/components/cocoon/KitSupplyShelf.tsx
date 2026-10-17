import { useState } from "react";
const essentials = [
  {
    name: "Power bank & matching cable",
    query: "usb c power bank cable",
    why: "A reserve for contacting people and opening directions.",
    check:
      "Check compatibility, capacity, seller details and the transport operator’s battery rules.",
  },
  {
    name: "Small torch",
    query: "compact rechargeable torch",
    why: "A separate light can save phone charge and help you see a path.",
    check:
      "Look at size, charging method, weather rating and whether you can operate it comfortably.",
  },
  {
    name: "Personal alarm or whistle",
    query: "personal safety alarm keychain",
    why: "An optional way to attract attention; it does not contact emergency services.",
    check:
      "Check age guidance, how to activate and silence it, and hearing precautions. Do not test close to ears.",
  },
  {
    name: "Compact first-aid pouch",
    query: "small travel first aid pouch",
    why: "Room for basic supplies you know how to use and medication you already need.",
    check:
      "Check contents, expiry dates, allergies and any travel restrictions with an appropriate professional.",
  },
  {
    name: "Reusable water bottle",
    query: "small reusable water bottle",
    why: "An everyday essential you may already own.",
    check:
      "Choose a practical size and an easy-to-clean closure. Buying something new is optional.",
  },
];
export function KitSupplyShelf() {
  const [store, setStore] = useState("https://www.amazon.com");
  return (
    <section
      id="packing-bench"
      className="kit-supply-shelf shopping-gallery"
      aria-labelledby="supply-title"
    >
      <div className="supply-intro">
        <svg viewBox="0 0 250 270" aria-hidden="true">
          <path
            d="M66 78Q65 23 125 25Q185 23 184 78"
            fill="none"
            stroke="#82634f"
            strokeWidth="12"
          />
          <path
            d="M43 73Q125 45 207 73L220 230Q125 261 30 230Z"
            fill="#8a5552"
            stroke="#4d3c42"
            strokeWidth="6"
          />
          <path d="M44 86Q124 111 204 86L195 161Q125 183 53 161Z" fill="#c58c69" />
          <path d="M69 158V247M179 158V247" stroke="#483941" strokeWidth="12" />
          <path d="M109 140H140V174H109Z" fill="#efcf96" />
          <path d="M43 218Q121 239 212 216" fill="none" stroke="#d5ad81" strokeWidth="3" />
          <path d="M22 243L68 258M205 245L239 232" stroke="#d6b886" strokeWidth="5" />
        </svg>
        <span className="eyebrow">The packing bench</span>
        <h2 id="supply-title">
          YOUR EVERYDAY BACKUP.
          <br />
          <em>SEE IT. CHOOSE IT.</em>
        </h2>
        <p>
          Start with what you already have. These are optional examples, not tested products or a
          promise of protection.
        </p>
        <label>
          Browse a shop{" "}
          <select value={store} onChange={(e) => setStore(e.target.value)}>
            <option value="https://www.amazon.com">Amazon.com · US</option>
            <option value="https://www.amazon.in">Amazon.in · India</option>
            <option value="https://www.amazon.co.uk">Amazon.co.uk · UK</option>
          </select>
        </label>
      </div>
      <div className="supply-list">
        {essentials.map((item, i) => (
          <article className={`supply-product supply-product-${i}`} key={item.name}>
            <ProductSketch index={i} />
            <span className="eyebrow">Optional essential</span>
            <h3>{item.name}</h3>
            <p>{item.why}</p>
            <p className="supply-practical">
              <strong>Before you pack</strong>
              {item.check}
            </p>
            <a
              href={`${store}/s?k=${encodeURIComponent(item.query)}`}
              target="_blank"
              rel="noopener noreferrer nofollow"
            >
              Shop examples on {new URL(store).hostname.replace("www.", "")} ↗
            </a>
          </article>
        ))}
        <p className="source-standard">
          Retail search links only · no affiliate tags, endorsements, checked prices or stock
          guarantees. You leave Cocoon when opening a shop. Check product instructions and local
          rules.
        </p>
        <a
          className="learn-source"
          href="https://www.gov.uk/guidance/foreign-travel-checklist"
          target="_blank"
          rel="noopener noreferrer"
        >
          Travel preparation source · GOV.UK (UK-focused) ↗
        </a>
      </div>
    </section>
  );
}

function ProductSketch({ index }: { index: number }) {
  return (
    <div className="product-sketch" aria-hidden="true">
      <svg viewBox="0 0 220 210">
        <ellipse cx="110" cy="188" rx="65" ry="11" fill="#26363b" opacity=".14" />
        {index === 0 ? (
          <g transform="rotate(-9 110 100)">
            <rect x="67" y="25" width="93" height="151" rx="17" fill="#354a51" />
            <path d="M74 38Q110 25 150 38V154Q107 165 74 154Z" fill="#5c7879" />
            <rect x="88" y="26" width="24" height="5" rx="2" fill="#1c2a32" />
            <path d="M88 74h48v50H88Z" fill="none" stroke="#d8cfaa" strokeWidth="2" />
            <path d="M104 81l-8 20h15l-7 18 20-25h-15l8-13" fill="#edd39d" />
            {[0, 1, 2].map((i) => (
              <circle key={i} cx={96 + i * 12} cy="145" r="3" fill="#efd4a1" />
            ))}
          </g>
        ) : index === 1 ? (
          <g transform="rotate(24 110 100)">
            <path d="M89 80h42v94q-21 14-42 0Z" fill="#7b535a" />
            <path d="M77 45h66l-12 45H89Z" fill="#b87a70" />
            <ellipse cx="110" cy="45" rx="33" ry="12" fill="#ecd1a3" />
            <ellipse cx="110" cy="45" rx="25" ry="8" fill="#f8e3b7" />
            <path d="M97 107h26m-26 12h26m-26 12h26m-26 12h26" stroke="#d8ac90" strokeWidth="3" />
            <rect x="103" y="87" width="14" height="13" rx="5" fill="#e1c495" />
          </g>
        ) : index === 2 ? (
          <g>
            <circle cx="110" cy="40" r="22" fill="none" stroke="#aa957c" strokeWidth="6" />
            <rect x="73" y="60" width="75" height="115" rx="36" fill="#c78374" />
            <rect x="82" y="67" width="56" height="98" rx="28" fill="#dfa58c" />
            <circle cx="110" cy="104" r="18" fill="#f3d5aa" />
            <path d="M94 144h32m-28 7h24" stroke="#8d5c59" strokeWidth="3" />
            <circle cx="110" cy="104" r="9" fill="#a66c66" />
          </g>
        ) : index === 3 ? (
          <g transform="rotate(-8 110 110)">
            <path d="M83 61V46q27-21 54 0v15" fill="none" stroke="#966b62" strokeWidth="9" />
            <rect x="47" y="65" width="127" height="103" rx="19" fill="#b77869" />
            <rect x="55" y="71" width="111" height="86" rx="15" fill="#dfb193" />
            <path d="M99 91h23v15h15v23h-15v15H99v-15H84v-23h15Z" fill="#f6dfb6" />
            <path d="M52 80h119" stroke="#7e5d58" strokeWidth="3" />
          </g>
        ) : (
          <g>
            <path d="M90 45h40V30H90Z" fill="#52676b" />
            <path d="M88 46Q78 58 78 75V162q32 22 64 0V75q0-17-12-29Z" fill="#8ea99a" />
            <path d="M87 75q23 8 46 0v79q-23 17-46 0Z" fill="#b9c9ab" />
            <path d="M95 48v109" stroke="#e1e2bb" strokeWidth="4" opacity=".65" />
            <path d="M92 30v-9h34v9" fill="none" stroke="#52676b" strokeWidth="5" />
          </g>
        )}
      </svg>
      <span>Illustration · category example</span>
    </div>
  );
}
