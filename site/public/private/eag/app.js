"use strict";
function startGuide(guideData) {
  const data = guideData;
  const meetings = data.meetings;
  const list = document.querySelector("#meeting-list");
  const briefEl = document.querySelector("#brief");
  let filterDay = "all",
    query = "";
  const normalize = (s) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
    );
  const time = (s) => {
    const [h, m] = s.split(":").map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
  };
  const dayLabel = (d) =>
    new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      timeZone: "America/New_York",
    }).format(new Date(d + "T12:00:00-04:00"));
  const nextIndex = () => {
    const i = meetings.findIndex((m) => new Date(m.ends_at).getTime() > Date.now());
    return i < 0 ? 0 : i;
  };
  const indexFromHash = () => {
    try {
      return meetings.findIndex((m) => m.brief?.slug === decodeURIComponent(location.hash.slice(1)));
    } catch {
      return -1;
    }
  };
  let selected = indexFromHash() >= 0 ? indexFromHash() : nextIndex();
  const icon = (type) =>
    type === "time"
      ? '<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><circle cx="10" cy="10" r="7.4"/><path d="M10 5.5v5l3 1.5"/></svg>'
      : '<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><path d="M15.7 8.3c0 4-5.7 8.3-5.7 8.3S4.3 12.3 4.3 8.3a5.7 5.7 0 1 1 11.4 0Z"/><circle cx="10" cy="8" r="1.8"/></svg>';
  const noteDrafts = new Map(),
    pendingSaves = new Map(),
    saveTimers = new Map();
  let remoteReady = false,
    refreshing = false;
  const noteKey = (m) => "selfness:eag-2026:notes:v2:" + m.brief.slug;
  function persistNote(m, note) {
    try {
      localStorage.setItem(
        noteKey(m),
        JSON.stringify({ value: note.value, baseVersion: note.baseVersion, dirty: note.dirty }),
      );
      note.storageFailed = false;
    } catch {
      note.storageFailed = true;
    }
  }
  function readNote(m) {
    const slug = m.brief.slug;
    if (noteDrafts.has(slug)) return noteDrafts.get(slug);
    let note = {
      value: "",
      baseVersion: null,
      dirty: false,
      status: "Loading synced notes…",
      conflict: undefined,
      storageFailed: false,
    };
    try {
      const raw = JSON.parse(localStorage.getItem(noteKey(m)) || "null");
      if (raw && typeof raw.value === "string") {
        note.value = raw.value;
        note.baseVersion = raw.baseVersion || null;
        note.dirty = !!raw.dirty;
      }
    } catch {
      note.storageFailed = true;
    }
    noteDrafts.set(slug, note);
    return note;
  }
  function notesMarkup(m) {
    return `<section class="personal-notes mb-9 [&_textarea]:block [&_textarea]:w-full [&_textarea]:min-h-32 [&_textarea]:resize-y [&_textarea]:border [&_textarea]:border-fg/15 [&_textarea]:rounded [&_textarea]:bg-white/50 [&_textarea]:p-3 [&_textarea]:text-base [&_textarea]:leading-[1.7] [&_textarea]:placeholder:text-muted" aria-labelledby="notes-label"><div class="notes-heading flex items-baseline justify-between gap-2 flex-wrap mb-2 [&_label]:text-sm [&_label]:font-semibold [&_span]:text-xs [&_span]:text-muted"><label id="notes-label" for="participant-notes">Your notes<span class="sr-only"> for ${esc(m.person)}</span></label><span id="notes-status" role="status" aria-live="polite"></span></div><textarea id="participant-notes" rows="3" maxlength="20000" placeholder="Questions, things to remember, follow-ups…" aria-describedby="notes-help notes-status"></textarea><p id="notes-help" class="mt-2 text-xs leading-6 text-muted">Autosaves across your devices. A local copy stays in this browser.</p><div id="notes-conflict" class="mt-3" hidden><p class="text-sm text-primary-dark mb-2">This note changed on another device. Your draft is still above.</p><details class="text-xs"><summary class="min-h-11 cursor-pointer py-3">View synced version</summary><pre id="remote-note" class="whitespace-pre-wrap break-words border border-fg/15 p-3 rounded-md"></pre></details><div class="flex gap-2 flex-wrap"><button id="keep-draft" class="button min-h-11 px-3 py-2 border border-fg/15 rounded text-sm hover:bg-fg/5">Keep my draft</button><button id="use-synced" class="button min-h-11 px-3 py-2 border border-fg/15 rounded text-sm hover:bg-fg/5">Use synced version</button></div></div></section>`;
  }
  function updateNoteUI() {
    const m = meetings[selected],
      note = readNote(m),
      input = document.querySelector("#participant-notes");
    if (!input) return;
    if (input.value !== note.value) input.value = note.value;
    document.querySelector("#notes-status").textContent = note.storageFailed
      ? "Local backup unavailable · " + note.status
      : note.status;
    const conflict = document.querySelector("#notes-conflict");
    conflict.hidden = note.conflict === undefined;
    if (note.conflict !== undefined)
      document.querySelector("#remote-note").textContent = note.conflict?.value || "(Empty note)";
  }
  function bindNotes(m) {
    const input = document.querySelector("#participant-notes");
    input.value = readNote(m).value;
    updateNoteUI();
    input.addEventListener("input", () => {
      const note = readNote(m);
      note.value = input.value;
      note.dirty = true;
      note.status = note.conflict === undefined ? "Saving…" : "Choose which version to keep";
      persistNote(m, note);
      updateNoteUI();
      clearTimeout(saveTimers.get(m.brief.slug));
      saveTimers.set(
        m.brief.slug,
        setTimeout(() => savePerson(m), 600),
      );
    });
    document.querySelector("#keep-draft").addEventListener("click", () => {
      const note = readNote(m);
      note.baseVersion = note.conflict?.version || null;
      note.conflict = undefined;
      note.dirty = true;
      persistNote(m, note);
      savePerson(m);
    });
    document.querySelector("#use-synced").addEventListener("click", () => {
      const note = readNote(m);
      note.value = note.conflict?.value || "";
      note.baseVersion = note.conflict?.version || null;
      note.conflict = undefined;
      note.dirty = false;
      note.status = "Synced";
      persistNote(m, note);
      updateNoteUI();
    });
  }
  async function savePerson(m) {
    const slug = m.brief.slug,
      note = readNote(m);
    if (!note.dirty || note.conflict !== undefined || pendingSaves.has(slug)) return;
    if (!remoteReady) {
      note.status = "Saved locally · waiting for sync";
      updateNoteUI();
      return;
    }
    const sentValue = note.value;
    note.status = "Saving…";
    updateNoteUI();
    const work = (async () => {
      try {
        const response = await fetch("/private/eag/api/notes", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, value: sentValue, baseVersion: note.baseVersion }),
          signal: AbortSignal.timeout(15000),
        });
        const payload = await response.json();
        if (response.status === 409) {
          note.conflict = payload.current;
          note.status = "Changed on another device";
          return;
        }
        if (!response.ok) throw new Error(response.status === 401 ? "Unlock again to sync" : "Sync unavailable");
        note.baseVersion = payload.note.version;
        note.dirty = note.value !== sentValue;
        note.status = note.dirty ? "Saving…" : "Synced";
        persistNote(m, note);
      } catch (error) {
        note.status =
          error.message === "Unlock again to sync"
            ? "Saved locally · unlock again to sync"
            : "Saved locally · will retry";
        persistNote(m, note);
      } finally {
        pendingSaves.delete(slug);
        updateNoteUI();
        if (note.dirty && note.status === "Saving…") savePerson(m);
      }
    })();
    pendingSaves.set(slug, work);
    await work;
  }
  async function refreshNotes() {
    if (refreshing || document.hidden || pendingSaves.size) return;
    refreshing = true;
    try {
      const response = await fetch("/private/eag/api/notes", { cache: "no-store", signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error("Sync unavailable");
      const payload = await response.json();
      remoteReady = true;
      for (const m of meetings) {
        const note = readNote(m),
          remote = payload.notes[m.brief.slug] || null;
        if (note.dirty) {
          if (remote?.value === note.value) {
            note.baseVersion = remote.version;
            note.dirty = false;
            note.conflict = undefined;
            note.status = "Synced";
          } else if ((remote?.version || null) !== note.baseVersion) {
            note.conflict = remote;
            note.status = "Changed on another device";
          }
        } else {
          note.value = remote?.value || "";
          note.baseVersion = remote?.version || null;
          note.conflict = undefined;
          note.status = "Synced";
        }
        persistNote(m, note);
      }
      document.querySelector("#sync-status").textContent = "Private · synced notes";
      updateNoteUI();
      for (const m of meetings) if (readNote(m).dirty && readNote(m).conflict === undefined) savePerson(m);
    } catch {
      document.querySelector("#sync-status").textContent = "Sync unavailable · local backup";
      for (const note of noteDrafts.values())
        if (note.conflict === undefined)
          note.status = note.dirty ? "Saved locally · will retry" : "Showing local backup";
      updateNoteUI();
    } finally {
      refreshing = false;
    }
  }
  function importNotes(payload) {
    if (!payload || payload.type !== "eag-notes-export-v1" || !payload.notes || typeof payload.notes !== "object")
      throw new Error("This is not an EAG notes export");
    let count = 0;
    for (const m of meetings) {
      const value = payload.notes[m.brief.slug];
      if (typeof value !== "string" || !value || value.length > 20000) continue;
      const note = readNote(m);
      if (value === note.value) continue;
      if (note.value) {
        note.conflict = { value: note.value, version: note.baseVersion };
        note.status = "Imported draft · choose which to keep";
      } else note.status = "Imported · saving…";
      note.value = value;
      note.dirty = true;
      persistNote(m, note);
      count++;
      if (note.conflict === undefined) savePerson(m);
    }
    updateNoteUI();
    document.querySelector("#sync-status").textContent = count ? `Imported ${count} notes` : "No new notes to import";
  }

  function filtered() {
    return meetings
      .map((m, i) => ({ m, i }))
      .filter(
        ({ m }) =>
          (filterDay === "all" || m.date === filterDay) &&
          normalize(
            [
              m.person,
              m.organization,
              m.role,
              m.display_organization,
              m.display_role,
              m.brief?.paragraph,
              ...(m.brief?.bullets || []).map((b) => b.text),
            ].join(" "),
          ).includes(normalize(query)),
      );
  }
  function renderList() {
    const rows = filtered();
    let currentDay = "";
    list.innerHTML =
      rows
        .map(({ m, i }) => {
          let heading = "";
          if (m.date !== currentDay) {
            heading = `<h2 class="date-label text-xs font-semibold text-muted px-3 pt-5 pb-2">${esc(dayLabel(m.date))}</h2>`;
            currentDay = m.date;
          }
          return (
            heading +
            `<button class="meeting-item flex gap-3 w-full text-left min-h-16 items-center px-3 py-3 rounded border-l-2 border-transparent aria-[current=true]:bg-primary/5 aria-[current=true]:border-primary hover:bg-fg/5 transition-colors" data-index="${i}" aria-current="${selected === i}" aria-label="${esc(m.person)}, ${esc(dayLabel(m.date))}, ${time(m.start)}"><span class="meeting-time min-w-11 text-xs leading-5 tabular-nums text-muted">${time(m.start).replace(" ", "<br>")}</span><span><span class="meeting-name block text-sm font-medium leading-5">${esc(m.person)}</span><span class="meeting-org block text-xs text-muted mt-1 leading-5">${esc(m.display_organization || m.organization)}</span></span><span class="meeting-arrow ml-auto text-primary-dark" aria-hidden="true">↗</span></button>`
          );
        })
        .join("") ||
      '<p class="empty-state py-8 px-3 text-sm text-muted">No meetings match.<br>Try a name, organization or topic.</p>';
    document.querySelector("#results-count").textContent = `${rows.length} meeting${rows.length === 1 ? "" : "s"}`;
    list
      .querySelectorAll("[data-index]")
      .forEach((b) => b.addEventListener("click", () => select(Number(b.dataset.index), true)));
  }
  function renderBrief() {
    const m = meetings[selected],
      b = m.brief;
    const citations = (ids) =>
      (ids || [])
        .map((id) => {
          const n = b.sources.findIndex((s) => s.id === id);
          return n < 0
            ? ""
            : `<a class="citation inline-flex items-center justify-center align-super text-xs p-1 ml-0.5 text-primary-dark hover:text-primary-darker no-underline min-w-5" href="${esc(b.sources[n].url)}" target="_blank" rel="noopener noreferrer" aria-label="Source ${n + 1}: ${esc(b.sources[n].title)}">${n + 1}</a>`;
        })
        .join("");
    const alt = m.location.startsWith("Alternative Location");
    const location = alt ? "Alternative location · venue closed" : m.location;
    briefEl.innerHTML = `<div class="brief-top flex items-center justify-between gap-3 mb-5 text-sm"><span class="brief-date text-muted">${esc(dayLabel(m.date))}</span><span class="confirmed text-xs text-muted">Confirmed</span></div><div class="person-heading flex justify-between items-start gap-5 [&_h2]:text-[28px] lg:[&_h2]:text-[32px] [&_h2]:font-medium [&_h2]:leading-tight [&_h2]:tracking-[-0.02em] [&_h2]:mb-3"><div><h2><a class="person-profile inline-block min-h-11 hover:text-primary-dark transition-colors [&_span]:text-lg [&_span]:text-primary-dark" href="${esc(m.profile_url)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(m.person)}’s Swapcard profile (opens in a new tab)">${esc(m.person)} <span aria-hidden="true">↗</span></a></h2><p class="role-line text-sm text-muted leading-6 [&_strong]:font-medium [&_strong]:text-fg">${esc(m.display_role || m.role)}<br><strong>${esc(m.display_organization || m.organization)}</strong></p></div><span class="person-index text-sm tabular-nums text-muted shrink-0 pt-2" aria-hidden="true">${String(selected + 1).padStart(2, "0")}</span></div><div class="logistics flex flex-wrap items-center gap-x-5 gap-y-2 mt-5 pb-6 mb-7 border-b border-fg/10 [&_span]:flex [&_span]:items-center [&_span]:gap-2 [&_span]:text-sm [&_span]:text-muted [&_svg]:shrink-0"><span class="time-range tabular-nums">${icon("time")}${time(m.start)} – ${time(m.end)}</span><span>${icon("pin")}${esc(location)}</span>${alt ? '<span class="location-warning">Check your direct conversation for the agreed meeting spot.</span>' : ""}</div>${notesMarkup(m)}${b ? `<p class="lead text-base leading-[1.7] mb-8">${esc(b.paragraph)}${citations(b.paragraph_source_ids)}</p><p class="takeaways-label text-sm font-semibold mb-4">Three things to know</p><ul class="takeaways list-disc pl-5 grid gap-6 marker:text-primary [&_strong]:block [&_strong]:text-base [&_strong]:font-semibold [&_strong]:mb-1 [&_p]:text-base [&_p]:leading-[1.7]">${b.bullets.map((x) => `<li><strong>${esc(x.label)}</strong><p>${esc(x.text)}${citations(x.source_ids)}</p></li>`).join("")}</ul><details class="sources border-t border-fg/10 mt-8 pt-2 [&_summary]:min-h-11 [&_summary]:cursor-pointer [&_summary]:text-sm [&_summary]:text-muted [&_summary]:py-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:text-sm [&_li]:py-2 [&_a]:text-primary-dark [&_a]:underline [&_a]:underline-offset-4"><summary>${b.sources.length} sources · Research & profile</summary><ol>${b.sources.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)} ↗</a></li>`).join("")}</ol></details>` : '<p class="pending py-8 text-muted">The schedule is ready. This person’s research brief is being prepared.</p>'}<div class="brief-bottom flex flex-wrap justify-between items-start gap-x-4 gap-y-2 border-t border-fg/10 pt-4 mt-2"><div class="profile-links flex flex-wrap gap-x-5 [&_a]:flex [&_a]:items-center [&_a]:min-h-11 [&_a]:text-sm [&_a]:text-primary-dark"><a href="${esc(m.profile_url)}" target="_blank" rel="noopener noreferrer">Swapcard profile ↗</a><a href="${esc(m.meeting_url)}" target="_blank" rel="noopener noreferrer">Meeting details ↗</a></div><div class="pager flex gap-2 [&_button]:w-11 [&_button]:h-11 [&_button]:border [&_button]:border-fg/15 [&_button]:rounded [&_button:disabled]:opacity-30 [&_button:disabled]:cursor-default"><button id="prev" aria-label="Previous meeting" ${selected === 0 ? "disabled" : ""}>←</button><button id="next" aria-label="Next meeting" ${selected === meetings.length - 1 ? "disabled" : ""}>→</button></div></div>`;
    bindNotes(m);
    document.querySelector("#prev").addEventListener("click", () => select(selected - 1, true));
    document.querySelector("#next").addEventListener("click", () => select(selected + 1, true));
    document.title = `${m.person} · EAG meeting notes`;
  }
  function select(i, scroll = false) {
    if (i < 0 || i >= meetings.length) return;
    selected = i;
    const m = meetings[selected];
    if (filterDay !== "all" && filterDay !== m.date) {
      filterDay = m.date;
      syncTabs();
    }
    if (query && !filtered().some((x) => x.i === i)) {
      query = "";
      document.querySelector("#search").value = "";
    }
    history.replaceState(null, "", "#" + encodeURIComponent(m.brief?.slug || m.person));
    renderList();
    renderBrief();
    if (scroll) {
      briefEl.focus({ preventScroll: true });
      if (matchMedia("(max-width:760px)").matches) briefEl.scrollIntoView({ block: "start" });
      else list.querySelector("[aria-current=true]")?.scrollIntoView({ block: "nearest" });
    }
  }
  function syncTabs() {
    document
      .querySelectorAll("[data-day]")
      .forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.day === filterDay)));
  }
  document.querySelectorAll("[data-day]").forEach((b) =>
    b.addEventListener("click", () => {
      filterDay = b.dataset.day;
      syncTabs();
      const rows = filtered();
      if (rows.length && !rows.some((x) => x.i === selected)) {
        selected = rows[0].i;
        renderBrief();
        history.replaceState(null, "", "#" + (meetings[selected].brief?.slug || ""));
      }
      renderList();
      list.scrollTop = 0;
    }),
  );
  document.querySelector("#search").addEventListener("input", (e) => {
    query = e.target.value;
    renderList();
  });
  document.querySelector("#next-up").addEventListener("click", () => {
    filterDay = "all";
    query = "";
    document.querySelector("#search").value = "";
    syncTabs();
    select(nextIndex(), true);
  });
  document.querySelector(".brand").addEventListener("click", (e) => {
    e.preventDefault();
    filterDay = "all";
    query = "";
    document.querySelector("#search").value = "";
    syncTabs();
    select(0, false);
  });
  window.addEventListener("hashchange", () => {
    const i = indexFromHash();
    if (i >= 0) select(i, false);
  });
  document.querySelector("#total").textContent = `${meetings.length} confirmed`;
  renderList();
  renderBrief();

  let importWindow = null;
  document.querySelector("#import-notes").addEventListener("click", () => {
    importWindow = window.open("http://127.0.0.1:8765/transfer.html", "eag-note-transfer");
    document.querySelector("#sync-status").textContent = "Use the local notes window to import";
    document.querySelector("#import-file").hidden = false;
  });
  document.querySelector("#import-file").addEventListener("click", () => document.querySelector("#notes-file").click());
  document.querySelector("#notes-file").addEventListener("change", async (event) => {
    try {
      const file = event.target.files[0];
      if (!file || file.size > 700000) throw new Error("Invalid file");
      importNotes(JSON.parse(await file.text()));
    } catch {
      document.querySelector("#sync-status").textContent = "Could not read notes export";
    }
    event.target.value = "";
  });
  window.addEventListener("message", (event) => {
    if (event.origin !== "http://127.0.0.1:8765" || event.source !== importWindow) return;
    try {
      importNotes(event.data);
      event.source.postMessage({ type: "eag-notes-imported" }, event.origin);
    } catch {}
  });
  document.querySelector("#lock-guide").addEventListener("click", async () => {
    await Promise.allSettled(meetings.filter((m) => readNote(m).dirty).map(savePerson));
    await fetch("/private/eag/api/session", { method: "DELETE" });
    location.reload();
  });
  window.addEventListener("online", refreshNotes);
  window.addEventListener("focus", refreshNotes);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refreshNotes();
    else for (const m of meetings) if (readNote(m).dirty) savePerson(m);
  });
  window.addEventListener("beforeunload", (event) => {
    if ([...noteDrafts.values()].some((note) => note.dirty && note.storageFailed)) {
      event.preventDefault();
      event.returnValue = "";
    }
  });
  setInterval(refreshNotes, 15000);
  refreshNotes();
}

let guideStarted = false;
async function unlockGuide(value) {
  let key = value.trim();
  try {
    if (key.includes("://")) key = new URLSearchParams(new URL(key).hash.slice(1)).get("key") || "";
  } catch {}
  const status = document.querySelector("#unlock-status");
  status.textContent = "Unlocking…";
  const response = await fetch("/private/eag/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });
  if (!response.ok) {
    status.textContent = "That unlock link is not valid.";
    return;
  }
  document.querySelector("#unlock-key").value = "";
  await loadGuide();
}
async function loadGuide() {
  try {
    const response = await fetch("/private/eag/api/data", { cache: "no-store" });
    if (!response.ok) {
      document.querySelector("#unlock-status").textContent =
        response.status === 401 ? "" : "The guide is temporarily unavailable. Please retry.";
      return;
    }
    const data = await response.json();
    document.querySelector("#locked").hidden = true;
    document.querySelector("#guide").hidden = false;
    if (!guideStarted) {
      guideStarted = true;
      startGuide(data);
    }
  } catch {
    document.querySelector("#unlock-status").textContent = "Unable to connect. Please retry.";
  }
}
document.querySelector("#unlock-form").addEventListener("submit", (event) => {
  event.preventDefault();
  unlockGuide(document.querySelector("#unlock-key").value).catch(() => {
    document.querySelector("#unlock-status").textContent = "Unable to connect. Please retry.";
  });
});
const unlockParams = new URLSearchParams(location.hash.slice(1));
if (unlockParams.has("key")) {
  const key = unlockParams.get("key");
  history.replaceState(null, "", location.pathname);
  unlockGuide(key).catch(() => {
    document.querySelector("#unlock-status").textContent = "Unable to connect. Please reopen your private link.";
  });
} else loadGuide();
