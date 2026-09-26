// F3 South Cary — site behavior. No build step, no dependencies.
(function () {
  "use strict";

  var CFG = window.F3SC || {};
  var DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  var WEEK = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  var DAY_SHORT = { monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu", friday: "Fri", saturday: "Sat", sunday: "Sun" };
  var TYPE_LABEL = { bootcamp: "Bootcamp", run: "Run", ruck: "Ruck", kettlebell: "Kettlebell", "3rdf": "3rd F" };

  // ---------- helpers ----------
  function $(sel, root) { return (root || document).querySelector(sel); }
  function esc(t) {
    return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function typeKey(t) { return String(t).toLowerCase().replace(/[^a-z0-9]/g, ""); }
  function typeLabel(t) { return TYPE_LABEL[typeKey(t)] || t; }
  function hm(raw) {
    var h = parseInt(raw.slice(0, 2), 10), m = raw.slice(2, 4);
    return { t: (h % 12 || 12) + ":" + m, ap: h >= 12 ? "PM" : "AM" };
  }
  function timeRange(w) {
    var a = hm(w.start), b = w.end ? hm(w.end) : null;
    return a.t + (b ? "–" + b.t : "") + " " + (b ? b.ap : a.ap);
  }
  function pills(types) {
    return types.map(function (t) {
      return '<span class="pill pill--' + esc(typeKey(t)) + '">' + esc(typeLabel(t)) + "</span>";
    }).join("");
  }
  function directionsUrl(w) { return "https://www.google.com/maps/dir/?api=1&destination=" + w.lat + "," + w.lng; }
  function f3MapUrl(w) { return "https://map.f3nation.com/?eventId=" + encodeURIComponent(w.id); }
  function todayKey() { return DAYS[new Date().getDay()]; }

  function load(url) {
    return fetch(url, { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error(url + " " + r.status);
      return r.json();
    });
  }

  function withPlaces(workouts, places) {
    var byAddr = (places && places.byAddress) || {};
    var byName = (places && places.byName) || {};
    return workouts.map(function (w) {
      var o = Object.assign({}, w);
      var n = byName[w.name];
      if (n) { o.place = n.place || ""; if (!o.address && n.address) o.address = n.address; }
      if (!o.place) {
        var lower = (o.address || "").toLowerCase();
        Object.keys(byAddr).some(function (k) {
          if (lower.indexOf(k.toLowerCase()) === 0) { o.place = byAddr[k]; return true; }
          return false;
        });
      }
      // Tidy address for display: drop a leading copy of the place name, fix "NC, 27518"
      var addr = (o.address || "").replace(/,\s*NC,\s*(\d{5})/, ", NC $1");
      if (o.place && addr.toLowerCase().indexOf(o.place.toLowerCase() + ",") === 0) addr = addr.slice(o.place.length + 1).trim();
      o.addressDisplay = addr;
      o.place = o.place || addr.split(",")[0] || "See map";
      return o;
    });
  }

  var dataPromise = null;
  function getData() {
    if (!dataPromise) {
      dataPromise = Promise.all([load("data/workouts.json"), load("data/places.json").catch(function () { return {}; })])
        .then(function (r) { return withPlaces(r[0].workouts || [], r[1]); });
    }
    return dataPromise;
  }

  // ---------- nav ----------
  var toggle = $(".nav-toggle"), nav = $("#site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }
  var yr = $("#year");
  if (yr) yr.textContent = new Date().getFullYear();
  document.querySelectorAll("[data-email]").forEach(function (a) {
    a.href = "mailto:" + CFG.email;
    if (!a.textContent.trim()) a.textContent = CFG.email;
  });

  // ---------- stats ----------
  var statsEl = $("[data-stats]");
  if (statsEl) {
    getData().then(function (ws) {
      var places = {}, days = {};
      ws.forEach(function (w) { places[w.place] = 1; days[w.day] = 1; });
      var set = function (k, v) { var el = statsEl.querySelector('[data-stat="' + k + '"]'); if (el) el.textContent = v; };
      set("workouts", ws.length);
      set("locations", Object.keys(places).length);
      set("days", Object.keys(days).length);
    }).catch(function () {});
  }

  // ---------- next up (home) ----------
  var upEl = $("#upcoming");
  if (upEl) {
    getData().then(function (ws) {
      var now = new Date(), nowHM = ("0" + now.getHours()).slice(-2) + ("0" + now.getMinutes()).slice(-2);
      var groups = [];
      for (var off = 0; off < 7 && groups.length < 2; off++) {
        var d = new Date(now); d.setDate(now.getDate() + off);
        var key = DAYS[d.getDay()];
        var list = ws.filter(function (w) { return w.day === key && (off > 0 || w.start > nowHM); })
          .sort(function (a, b) { return a.start.localeCompare(b.start); });
        if (list.length) groups.push({ label: off === 0 ? "Today" : off === 1 ? "Tomorrow" : cap(key), key: key, list: list });
      }
      upEl.innerHTML = groups.map(function (g) {
        return '<div><p class="up-day">' + esc(g.label) + '</p><div class="upcoming">' + g.list.map(function (w) {
          var t = hm(w.start);
          return '<a class="up" href="workouts.html?day=' + g.key + '"><div class="wo-time"><b>' + t.t + "</b><span>" + t.ap + "</span></div>" +
            "<div><h4>" + esc(w.name) + "</h4><p>" + esc(w.place) + " · " + esc(w.types.map(typeLabel).join(", ")) + "</p></div></a>";
        }).join("") + "</div></div>";
      }).join("");
    }).catch(function () { upEl.innerHTML = '<p class="empty">See the <a href="workouts.html">full schedule</a>.</p>'; });
  }

  // ---------- schedule (workouts page) ----------
  var schedEl = $("#schedule");
  if (schedEl) {
    var params = new URLSearchParams(location.search);
    var state = { day: params.get("day") || "all", type: params.get("type") || "all", view: params.get("view") || "day" };
    var dayBar = $("#filter-day"), typeBar = $("#filter-type"), viewBar = $("#filter-view");

    getData().then(function (ws) {
      var days = WEEK.filter(function (d) { return ws.some(function (w) { return w.day === d; }); });
      var types = [];
      ws.forEach(function (w) { w.types.forEach(function (t) { var k = typeKey(t); if (types.indexOf(k) < 0) types.push(k); }); });
      types.sort(function (a, b) { return Object.keys(TYPE_LABEL).indexOf(a) - Object.keys(TYPE_LABEL).indexOf(b); });

      function chip(group, value, label, dot) {
        return '<button type="button" class="chip" data-group="' + group + '" data-value="' + esc(value) + '" aria-pressed="false">' +
          (dot ? '<span class="dot" style="background:var(--t-' + esc(value) + ')"></span>' : "") + esc(label) + "</button>";
      }
      dayBar.insertAdjacentHTML("beforeend", chip("day", "all", "All days") + days.map(function (d) {
        return chip("day", d, DAY_SHORT[d] + (d === todayKey() ? " · Today" : ""));
      }).join(""));
      typeBar.insertAdjacentHTML("beforeend", chip("type", "all", "All types") + types.map(function (t) { return chip("type", t, TYPE_LABEL[t] || t, true); }).join(""));
      viewBar.insertAdjacentHTML("beforeend", chip("view", "day", "By day") + chip("view", "location", "By location"));

      document.addEventListener("click", function (e) {
        var b = e.target.closest(".chip[data-group]");
        if (!b) return;
        state[b.dataset.group] = b.dataset.value;
        var q = new URLSearchParams();
        if (state.day !== "all") q.set("day", state.day);
        if (state.type !== "all") q.set("type", state.type);
        if (state.view !== "day") q.set("view", state.view);
        history.replaceState(null, "", location.pathname + (q.toString() ? "?" + q : ""));
        render();
      });

      function card(w, showDay) {
        var t = hm(w.start);
        return '<article class="wo"><div class="wo-time"><b>' + t.t + "</b><span>" + t.ap + "</span></div><div>" +
          '<div class="pills">' + pills(w.types) + (showDay ? '<span class="pill pill--q">' + esc(cap(w.day)) + "</span>" : "") + "</div>" +
          "<h4>" + esc(w.name) + "</h4>" +
          '<p class="wo-where">' + esc(w.place) + " · " + esc(timeRange(w)) + "</p>" +
          '<p class="wo-addr">' + esc(w.addressDisplay) + "</p>" +
          (w.notes ? '<p class="wo-notes">' + esc(w.notes) + "</p>" : "") +
          '<div class="wo-links"><a href="' + directionsUrl(w) + '" target="_blank" rel="noopener">Directions →</a>' +
          '<a href="' + f3MapUrl(w) + '" target="_blank" rel="noopener">F3 Map</a></div></div></article>';
      }

      function render() {
        document.querySelectorAll(".chip[data-group]").forEach(function (b) {
          b.setAttribute("aria-pressed", state[b.dataset.group] === b.dataset.value ? "true" : "false");
        });
        var list = ws.filter(function (w) {
          return (state.day === "all" || w.day === state.day) &&
            (state.type === "all" || w.types.some(function (t) { return typeKey(t) === state.type; }));
        });
        $("#result-count").textContent = list.length + " workout" + (list.length === 1 ? "" : "s");
        if (!list.length) { schedEl.innerHTML = '<p class="empty">No workouts match those filters. Try another day or type.</p>'; return; }

        if (state.view === "location") {
          var byPlace = {};
          list.forEach(function (w) { (byPlace[w.place] = byPlace[w.place] || []).push(w); });
          schedEl.innerHTML = Object.keys(byPlace).sort(function (a, b) { return byPlace[b].length - byPlace[a].length || a.localeCompare(b); }).map(function (p) {
            var items = byPlace[p].sort(function (a, b) { return WEEK.indexOf(a.day) - WEEK.indexOf(b.day) || a.start.localeCompare(b.start); });
            return '<section class="loc-group"><div class="loc-head"><h3>' + esc(p) + '</h3><a href="' + directionsUrl(items[0]) +
              '" target="_blank" rel="noopener">Directions →</a></div><div class="wo-list">' + items.map(function (w) { return card(w, true); }).join("") + "</div></section>";
          }).join("");
          return;
        }
        schedEl.innerHTML = WEEK.map(function (d) {
          var items = list.filter(function (w) { return w.day === d; });
          if (!items.length) return "";
          return '<section class="day-group" id="' + d + '"><div class="day-head"><h3>' + cap(d) + "</h3>" +
            (d === todayKey() ? '<span class="badge-today">Today</span>' : "") +
            "<small>" + items.length + " workout" + (items.length === 1 ? "" : "s") + "</small></div>" +
            '<div class="wo-list">' + items.map(function (w) { return card(w, false); }).join("") + "</div></section>";
        }).join("");
      }
      render();
    }).catch(function (err) {
      console.error(err);
      schedEl.innerHTML = '<p class="empty">Couldn\'t load the schedule. Use the <a href="https://map.f3nation.com/?lat=' + CFG.mapCenter.lat + "&lng=" + CFG.mapCenter.lng + '&zoom=12">F3 Nation map</a> instead.</p>';
    });
  }

  // ---------- F3 Nation map embed ----------
  var mapFrame = $("#f3-map");
  if (mapFrame && CFG.mapCenter) {
    mapFrame.src = "https://map.f3nation.com/?lat=" + CFG.mapCenter.lat + "&lng=" + CFG.mapCenter.lng + "&zoom=" + CFG.mapCenter.zoom;
  }

  // ---------- optional live schedule (F3 Nation API) ----------
  var liveWrap = $("#live");
  if (liveWrap && CFG.f3ApiToken) {
    liveWrap.hidden = false;
    var liveEl = $("#live-body");
    var headers = { Authorization: "Bearer " + CFG.f3ApiToken, client: CFG.f3ApiClient || "f3-region-site" };
    var start = new Date(), end = new Date(); end.setDate(end.getDate() + 13);
    var iso = function (d) { return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); };
    var s = iso(start), e = iso(end), api = "https://api.f3nation.com/v1/event-instance";

    // Closures live on the event-instance list, not the schedule feed (see F3-Nation/Website-Widgets).
    var closures = fetch(api + "?regionOrgId=" + CFG.regionOrgId + "&startDate=" + s + "&pageIndex=0&pageSize=100", { headers: headers })
      .then(function (r) { return r.ok ? r.json() : {}; })
      .then(function (d) {
        var m = {};
        (d.eventInstances || []).forEach(function (x) {
          if (x.seriesException) m[x.id] = { status: x.seriesException, reason: (x.meta && x.meta.series_exception_reason) || "" };
        });
        return m;
      }).catch(function () { return {}; });

    Promise.all([
      fetch(api + "/calendar-home-schedule?regionOrgId=" + CFG.regionOrgId + "&userId=1&startDate=" + s + "&limit=150", { headers: headers })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }),
      closures
    ]).then(function (r) {
      var ex = r[1], byDate = {};
      (r[0].events || []).forEach(function (ev) {
        if (!ev.startTime || ev.startDate < s || ev.startDate > e) return;
        (byDate[ev.startDate] = byDate[ev.startDate] || []).push(ev);
      });
      var dates = Object.keys(byDate).sort().slice(0, 7);
      if (!dates.length) { liveEl.innerHTML = '<p class="empty">No upcoming events posted yet.</p>'; return; }
      liveEl.innerHTML = dates.map(function (ds) {
        var d = new Date(ds + "T12:00:00");
        var label = ds === s ? "Today" : d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
        return '<section class="day-group"><div class="day-head"><h3>' + esc(label) + '</h3></div><div class="wo-list">' +
          byDate[ds].sort(function (a, b) { return a.startTime.localeCompare(b.startTime); }).map(function (ev) {
            var x = ex[ev.id] || {}, closed = x.status === "closed", t = hm(ev.startTime);
            var tags = (closed ? '<span class="pill pill--closed">Closed</span>' : "") +
              pills((ev.eventTypes || []).map(function (et) { return et.name; })) +
              (closed ? "" : '<span class="pill pill--q">' + (ev.plannedQs ? "Q: " + esc(ev.plannedQs) : "Q open") + "</span>");
            return '<article class="wo' + (closed ? " wo--closed" : "") + '"><div class="wo-time"><b>' + t.t + "</b><span>" + t.ap + "</span></div><div>" +
              '<div class="pills">' + tags + "</div><h4>" + esc(ev.orgName || ev.seriesName || ev.name) + "</h4>" +
              (closed ? '<p class="wo-notes">' + esc(x.reason || "No workout this day") + "</p>" : "") + "</div></article>";
          }).join("") + "</div></section>";
      }).join("");
    }).catch(function (err) {
      console.warn("[F3 live schedule]", err);
      liveWrap.hidden = true;
    });
  }
})();
