import { FEATURE_GROUPS, SUBMISSION_LINKS } from "./config.js";

function renderFeatures() {
  const container = document.getElementById("feature-groups");
  if (!container) {
    return;
  }

  container.innerHTML = FEATURE_GROUPS.map(
    (group) => `
      <article class="feature-group">
        <div class="group-head">
          <div>
            <span class="eyebrow">${group.group}</span>
            <h2>${group.group} features</h2>
          </div>
          <span>${group.items.length} linked requirements</span>
        </div>
        <div class="feature-grid">
          ${group.items
            .map(
              (item) => `
                <article class="feature-card">
                  <header>
                    <h3>${item.title}</h3>
                    <span class="tag">Live section</span>
                  </header>
                  <p>${item.summary}</p>
                  <a href="index.html#${item.anchor}">Open in main desk</a>
                </article>
              `
            )
            .join("")}
        </div>
      </article>
    `
  ).join("");
}

function renderSubmissionLinks() {
  const container = document.getElementById("submission-links");
  if (!container) {
    return;
  }

  container.innerHTML = SUBMISSION_LINKS.map(
    (item) => `
      <a class="link-card" href="${item.href}">
        <span>Included file</span>
        <strong>${item.title}</strong>
        <p>${item.description}</p>
      </a>
    `
  ).join("");
}

renderFeatures();
renderSubmissionLinks();
