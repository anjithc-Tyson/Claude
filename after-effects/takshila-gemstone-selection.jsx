/*
 * Takshila — Gemstone Selection Video
 * After Effects ExtendScript (AE CC 2018 or newer).
 *
 * Builds a complete, editable project:
 *   Intro → one card per gemstone → "How to choose" checklist → Outro / CTA
 * Each section is its own precomp, so you can retime, reorder or restyle freely.
 *
 * Run:  After Effects → File → Scripts → Run Script File… → choose this file.
 * Edit: the CONFIG block below (copy, colours, fonts, durations, size, stone photos).
 */
(function takshilaGemstoneVideo() {

    var CONFIG = {
        // 1080x1920 = Reels / Shorts / Stories. Use 1080x1080 for feed, 1920x1080 for YouTube.
        width: 1080,
        height: 1920,
        fps: 30,

        brand: "TAKSHILA",
        kicker: "GEMSTONE SELECTION",
        tagline: "Find the stone that feels like yours",
        outroLine: "Made once, for one person.",
        cta: "Design yours",
        website: "takshila.co",

        // PostScript font names. Install from Google Fonts; AE substitutes a default if missing.
        fonts: {
            serif: "CormorantGaramond-Medium",
            sans: "AfacadFlux-Regular"
        },

        // Brand palette (from the Takshila web showcase), 0–1 RGB.
        colors: {
            bgCenter: [0.169, 0.063, 0.086],   // #2B1016 burgundy
            bgEdge:   [0.078, 0.039, 0.055],   // #140A0E night
            gold:     [0.753, 0.580, 0.208],   // #C09435
            ivory:    [0.961, 0.937, 0.906],   // #F5EFE7
            muted:    [0.820, 0.760, 0.730]
        },

        // Seconds.
        durations: { intro: 4, gem: 3.5, checklist: 5.5, outro: 4.5, transition: 0.5 },

        // image: optional full path to a transparent PNG of the real stone,
        // e.g. "C:/Takshila/stones/ruby.png" or "/Users/me/Takshila/ruby.png".
        // Leave "" to use the drawn vector gem.
        gems: [
            { name: "Diamond",       detail: "Mohs 10  ·  April",          note: "Timeless brilliance for every day",   color: [0.86, 0.93, 0.98], image: "" },
            { name: "Blue Sapphire", detail: "Mohs 9  ·  September",       note: "Deep blue, made for daily wear",      color: [0.07, 0.20, 0.62], image: "" },
            { name: "Ruby",          detail: "Mohs 9  ·  July",            note: "Bold red for statement pieces",       color: [0.72, 0.04, 0.16], image: "" },
            { name: "Emerald",       detail: "Mohs 7.5–8  ·  May",         note: "Lush green, best in a protective setting", color: [0.02, 0.55, 0.33], image: "" },
            { name: "Pink Sapphire", detail: "Mohs 9  ·  September",       note: "Soft pink with sapphire strength",    color: [0.93, 0.45, 0.62], image: "" },
            { name: "Morganite",     detail: "Mohs 7.5–8",                 note: "Peachy pink, glowing in rose gold",   color: [0.96, 0.70, 0.62], image: "" },
            { name: "Aquamarine",    detail: "Mohs 7.5–8  ·  March",       note: "Light, airy sea blue",                color: [0.50, 0.80, 0.90], image: "" },
            { name: "Tanzanite",     detail: "Mohs 6–6.5  ·  December",    note: "Violet blue for occasional wear",     color: [0.33, 0.25, 0.70], image: "" }
        ],

        checklistTitle: "How to choose\ryour gemstone",
        checklist: [
            { title: "Colour",    text: "Rich, even tone you love in daylight" },
            { title: "Clarity",   text: "Clean to the eye, no distracting flaws" },
            { title: "Cut",       text: "Symmetry that brings out the sparkle" },
            { title: "Carat",     text: "A size that suits the piece and your hand" },
            { title: "Certified", text: "Every Takshila stone — GIA & IGI" }
        ]
    };

    // ------------------------------------------------------------------ setup

    var W = CONFIG.width, H = CONFIG.height, CX = W / 2;
    var S = Math.min(W / 1080, H / 1920);          // layout scale (designed at 1080x1920)
    var C = CONFIG.colors, D = CONFIG.durations, F = CONFIG.fonts;
    var GEMS = CONFIG.gems;
    var warnings = [];
    var rootFolder, sectionFolder, assetFolder;

    function y(f) { return H * f; }
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
    function tr(layer, name) { return layer.property("ADBE Transform Group").property(name); }

    function newComp(name, dur) {
        var c = app.project.items.addComp(name, W, H, 1, dur, CONFIG.fps);
        c.bgColor = C.bgEdge;
        c.parentFolder = sectionFolder;
        return c;
    }

    // --------------------------------------------------------------- keyframes

    function easeDims(prop) {
        var t = prop.propertyValueType;
        if (t === PropertyValueType.ThreeD) return 3;
        if (t === PropertyValueType.TwoD) return 2;
        return 1; // 1D and spatial properties take a single ease
    }

    function easeAll(prop) {
        var e = [], i, n = easeDims(prop);
        for (i = 0; i < n; i++) e.push(new KeyframeEase(0, 75));
        for (i = 1; i <= prop.numKeys; i++) prop.setTemporalEaseAtKey(i, e, e);
    }

    function keys(prop, times, values) {
        for (var i = 0; i < times.length; i++) prop.setValueAtTime(times[i], values[i]);
        easeAll(prop);
    }

    function fadeIn(layer, t, dur, rise) {
        keys(tr(layer, "ADBE Opacity"), [t, t + dur], [0, 100]);
        if (rise) {
            var p = tr(layer, "ADBE Position").value;
            keys(tr(layer, "ADBE Position"), [t, t + dur], [[p[0], p[1] + rise * S], [p[0], p[1]]]);
        }
    }

    function popIn(layer, t, base) {
        keys(tr(layer, "ADBE Scale"), [t, t + 0.45, t + 0.7],
            [[0, 0, 100], [base * 1.08, base * 1.08, 100], [base, base, 100]]);
    }

    function growX(layer, t, dur) {
        keys(tr(layer, "ADBE Scale"), [t, t + dur], [[0, 100, 100], [100, 100, 100]]);
    }

    // ------------------------------------------------------------------ layers

    function addBackground(comp, centerY) {
        var l = comp.layers.addSolid(C.bgEdge, "Background", W, H, 1, comp.duration);
        var fx = l.property("ADBE Effect Parade").addProperty("ADBE Ramp");
        fx.property("ADBE Ramp-0001").setValue([CX, centerY]);           // start point
        fx.property("ADBE Ramp-0002").setValue(C.bgCenter);              // start colour
        fx.property("ADBE Ramp-0003").setValue([CX, centerY + H * 0.75]); // end point
        fx.property("ADBE Ramp-0004").setValue(C.bgEdge);                // end colour
        fx.property("ADBE Ramp-0005").setValue(2);                       // radial
        l.locked = true;
        return l;
    }

    function addText(comp, str, o) {
        var l = comp.layers.addText(str);
        var prop = l.property("ADBE Text Properties").property("ADBE Text Document");
        var d = prop.value;
        d.fontSize = o.size * S;
        d.applyFill = true;
        d.fillColor = o.color || C.ivory;
        d.applyStroke = false;
        if (o.font) d.font = o.font;
        d.tracking = o.tracking || 0;
        if (o.leading) { d.autoLeading = false; d.leading = o.leading * S; }
        d.justification = o.left ? ParagraphJustification.LEFT_JUSTIFY : ParagraphJustification.CENTER_JUSTIFY;
        prop.setValue(d);
        tr(l, "ADBE Position").setValue(o.pos);
        if (o.name) l.name = o.name;
        return l;
    }

    function shapeLayer(comp, name, pos) {
        var l = comp.layers.addShape();
        l.name = name;
        tr(l, "ADBE Position").setValue(pos);
        return l;
    }

    // Appends one group (path + fill/stroke). In a shape layer the FIRST group is
    // front-most, so call this front-to-back. Returns the group's transform.
    function addShapeGroup(layer, o) {
        var root = layer.property("ADBE Root Vectors Group");
        var g = root.addProperty("ADBE Vector Group");
        g.name = o.name;
        var v = g.property("ADBE Vectors Group");
        var s;
        if (o.kind === "ellipse") {
            s = v.addProperty("ADBE Vector Shape - Ellipse");
            s.property("ADBE Vector Ellipse Size").setValue(o.size);
        } else if (o.kind === "rect") {
            s = v.addProperty("ADBE Vector Shape - Rect");
            s.property("ADBE Vector Rect Size").setValue(o.size);
            if (o.roundness) s.property("ADBE Vector Rect Roundness").setValue(o.roundness);
        } else {
            s = v.addProperty("ADBE Vector Shape - Star");
            s.property("ADBE Vector Star Type").setValue(o.inner ? 1 : 2); // 1 star, 2 polygon
            s.property("ADBE Vector Star Points").setValue(o.points);
            s.property("ADBE Vector Star Outer Radius").setValue(o.radius);
            if (o.inner) s.property("ADBE Vector Star Inner Radius").setValue(o.inner);
            if (o.rotation) s.property("ADBE Vector Star Rotation").setValue(o.rotation);
        }
        if (o.fill) {
            var f = v.addProperty("ADBE Vector Graphic - Fill");
            f.property("ADBE Vector Fill Color").setValue(o.fill);
            if (o.fillOpacity !== undefined) f.property("ADBE Vector Fill Opacity").setValue(o.fillOpacity);
        }
        if (o.stroke) {
            var st = v.addProperty("ADBE Vector Graphic - Stroke");
            st.property("ADBE Vector Stroke Color").setValue(o.stroke);
            st.property("ADBE Vector Stroke Width").setValue(o.strokeWidth || 2 * S);
            if (o.strokeOpacity !== undefined) st.property("ADBE Vector Stroke Opacity").setValue(o.strokeOpacity);
        }
        var xf = root.property(root.numProperties).property("ADBE Vector Transform Group");
        if (o.offset) xf.property("ADBE Vector Position").setValue(o.offset);
        return xf;
    }

    function addDivider(comp, posY, width, t) {
        var l = shapeLayer(comp, "Divider", [CX, posY]);
        addShapeGroup(l, { name: "Line", kind: "rect", size: [width * S, 2 * S], fill: C.gold });
        growX(l, t, 0.6);
        return l;
    }

    function addGlow(comp, pos, radius, color) {
        var l = shapeLayer(comp, "Glow", pos);
        addShapeGroup(l, { name: "Glow", kind: "ellipse", size: [radius * 2.6, radius * 2.6], fill: color });
        var blur = l.property("ADBE Effect Parade").addProperty("ADBE Gaussian Blur 2");
        blur.property("ADBE Gaussian Blur 2-0001").setValue(160 * S);
        tr(l, "ADBE Opacity").expression = "linear(time, 0, 0.8, 0, 1) * (38 + 10 * Math.sin(time * 2.2));";
        return l;
    }

    // Octagonal brilliant seen face-up: girdle, crown, star facets, table, highlight.
    function drawGem(comp, gem, pos, r) {
        var l = shapeLayer(comp, gem.name, pos);
        var light = mix(gem.color, [1, 1, 1], 0.5);
        var deep = mix(gem.color, [0, 0, 0], 0.4);
        addShapeGroup(l, { name: "Highlight", kind: "ellipse", size: [r * 0.22, r * 0.14], fill: [1, 1, 1], fillOpacity: 70, offset: [-r * 0.22, -r * 0.3] });
        addShapeGroup(l, { name: "Star facets", points: 8, radius: r * 0.8, inner: r * 0.46, stroke: light, strokeWidth: 1.5 * S, strokeOpacity: 70 });
        addShapeGroup(l, { name: "Table", points: 8, radius: r * 0.46, rotation: 22.5, fill: light, fillOpacity: 55, stroke: light, strokeWidth: 2 * S });
        addShapeGroup(l, { name: "Crown", points: 8, radius: r * 0.8, rotation: 22.5, fill: gem.color, stroke: light, strokeWidth: 1.5 * S, strokeOpacity: 60 });
        addShapeGroup(l, { name: "Girdle", points: 8, radius: r, rotation: 22.5, fill: deep, stroke: C.gold, strokeWidth: 5 * S });
        return l;
    }

    function placeImage(comp, path, pos, targetH) {
        var f = new File(path);
        if (!f.exists) { warnings.push("Image not found, drew a vector gem instead: " + path); return null; }
        var item = app.project.importFile(new ImportOptions(f));
        item.parentFolder = assetFolder;
        var l = comp.layers.add(item);
        tr(l, "ADBE Position").setValue(pos);
        return { layer: l, scale: targetH / item.height * 100 };
    }

    function addSparkles(comp, pos, r, start) {
        var l = shapeLayer(comp, "Sparkles", pos);
        var spots = [[-r * 0.55, -r * 0.6], [r * 0.6, -r * 0.15]];
        for (var i = 0; i < spots.length; i++) {
            var xf = addShapeGroup(l, { name: "Sparkle " + (i + 1), points: 4, radius: r * 0.17, inner: r * 0.025, fill: [1, 1, 1], offset: spots[i] });
            var t = start + i * 0.9;
            keys(xf.property("ADBE Vector Scale"), [t, t + 0.3, t + 0.7], [[0, 0], [100, 100], [0, 0]]);
            keys(xf.property("ADBE Vector Rotation"), [t, t + 0.7], [0, 90]);
        }
        return l;
    }

    // Row of small stones in every gem colour, popping in left to right.
    function addGemDots(comp, posY, start) {
        var gap = 64 * S, x0 = CX - gap * (GEMS.length - 1) / 2;
        for (var i = 0; i < GEMS.length; i++) {
            var l = shapeLayer(comp, "Dot " + GEMS[i].name, [x0 + gap * i, posY]);
            addShapeGroup(l, { name: "Dot", points: 8, radius: 15 * S, rotation: 22.5, fill: GEMS[i].color, stroke: C.gold, strokeWidth: 1.5 * S });
            popIn(l, start + i * 0.07, 100);
        }
    }

    function addFooter(comp) {
        var l = addText(comp, CONFIG.brand, { size: 30, color: C.gold, font: F.serif, tracking: 500, pos: [CX, y(0.93)], name: "Footer" });
        fadeIn(l, 0.3, 0.6);
        tr(l, "ADBE Opacity").setValueAtTime(0.9, 70);
        return l;
    }

    // ---------------------------------------------------------------- sections

    function buildIntro(dur) {
        var comp = newComp("01 Intro", dur);
        addBackground(comp, y(0.45));
        var k = addText(comp, CONFIG.kicker, { size: 32, color: C.gold, font: F.sans, tracking: 450, pos: [CX, y(0.415)] });
        fadeIn(k, 0.2, 0.7, 20);
        var b = addText(comp, CONFIG.brand, { size: 150, font: F.serif, tracking: 180, pos: [CX, y(0.49)] });
        fadeIn(b, 0.5, 0.9, 30);
        keys(tr(b, "ADBE Scale"), [0.5, 1.6], [[110, 110, 100], [100, 100, 100]]);
        addDivider(comp, y(0.515), 260, 1.0);
        var tl = addText(comp, CONFIG.tagline, { size: 48, color: C.muted, font: F.serif, pos: [CX, y(0.56)] });
        fadeIn(tl, 1.2, 0.7, 20);
        addGemDots(comp, y(0.63), 1.7);
        return comp;
    }

    function buildGemCard(gem, index, dur) {
        var comp = newComp(pad(index + 2) + " " + gem.name, dur);
        var gemPos = [CX, y(0.37)], r = 230 * S;
        addBackground(comp, gemPos[1]);
        addGlow(comp, gemPos, r, gem.color);

        var visual = gem.image ? placeImage(comp, gem.image, gemPos, r * 2.1) : null;
        var gl = visual ? visual.layer : drawGem(comp, gem, gemPos, r);
        popIn(gl, 0.1, visual ? visual.scale : 100);
        tr(gl, "ADBE Rotate Z").expression = "Math.sin(time * 0.9) * 4;";
        addSparkles(comp, gemPos, r, 0.9);

        var idx = addText(comp, pad(index + 1) + "  /  " + pad(GEMS.length), { size: 30, color: C.gold, font: F.sans, tracking: 300, pos: [CX, y(0.12)], name: "Index" });
        fadeIn(idx, 0.2, 0.5);
        var nm = addText(comp, gem.name, { size: 112, font: F.serif, pos: [CX, y(0.615)], name: "Name" });
        fadeIn(nm, 0.4, 0.6, 40);
        addDivider(comp, y(0.64), 180, 0.7);
        var dt = addText(comp, gem.detail, { size: 36, color: C.gold, font: F.sans, tracking: 120, pos: [CX, y(0.68)], name: "Detail" });
        fadeIn(dt, 0.8, 0.5, 20);
        var nt = addText(comp, gem.note, { size: 44, color: C.muted, font: F.serif, pos: [CX, y(0.735)], name: "Note" });
        fadeIn(nt, 1.0, 0.6, 20);
        addFooter(comp);
        return comp;
    }

    function buildChecklist(dur) {
        var comp = newComp(pad(GEMS.length + 2) + " How to choose", dur);
        addBackground(comp, y(0.3));
        var title = addText(comp, CONFIG.checklistTitle, { size: 92, font: F.serif, leading: 100, pos: [CX, y(0.2)], name: "Title" });
        fadeIn(title, 0.2, 0.7, 30);
        addDivider(comp, y(0.29), 220, 0.6);

        var left = W * 0.15, step = 165 * S, top = y(0.37);
        for (var i = 0; i < CONFIG.checklist.length; i++) {
            var it = CONFIG.checklist[i], rowY = top + step * i, t = 0.8 + i * 0.4;
            var bullet = shapeLayer(comp, "Bullet " + (i + 1), [left, rowY - 16 * S]);
            addShapeGroup(bullet, { name: "Diamond", points: 4, radius: 13 * S, fill: C.gold });
            popIn(bullet, t, 100);
            var h = addText(comp, it.title, { size: 50, color: C.gold, font: F.serif, left: true, pos: [left + 44 * S, rowY], name: it.title });
            fadeIn(h, t, 0.5, 20);
            var p = addText(comp, it.text, { size: 34, color: C.muted, font: F.sans, left: true, pos: [left + 44 * S, rowY + 50 * S], name: it.title + " text" });
            fadeIn(p, t + 0.1, 0.5, 20);
        }
        addFooter(comp);
        return comp;
    }

    function buildOutro(dur) {
        var comp = newComp(pad(GEMS.length + 3) + " Outro", dur);
        addBackground(comp, y(0.47));
        addGemDots(comp, y(0.39), 0.2);
        var b = addText(comp, CONFIG.brand, { size: 150, font: F.serif, tracking: 180, pos: [CX, y(0.48)] });
        fadeIn(b, 0.5, 0.8, 30);
        addDivider(comp, y(0.505), 260, 0.9);
        var ln = addText(comp, CONFIG.outroLine, { size: 50, color: C.muted, font: F.serif, pos: [CX, y(0.55)] });
        fadeIn(ln, 1.1, 0.6, 20);

        var pillY = y(0.635);
        var pill = shapeLayer(comp, "CTA button", [CX, pillY]);
        addShapeGroup(pill, { name: "Pill", kind: "rect", size: [560 * S, 104 * S], roundness: 52 * S, fill: C.gold });
        popIn(pill, 1.5, 100);
        var cta = addText(comp, CONFIG.cta, { size: 44, color: C.bgEdge, font: F.sans, tracking: 80, pos: [CX, pillY + 15 * S], name: "CTA" });
        fadeIn(cta, 1.8, 0.4);
        var web = addText(comp, CONFIG.website, { size: 38, color: C.ivory, font: F.sans, tracking: 150, pos: [CX, y(0.7)], name: "Website" });
        fadeIn(web, 2.0, 0.5, 15);
        return comp;
    }

    // -------------------------------------------------------------------- main

    function build() {
        if (!app.project) app.newProject();
        rootFolder = app.project.items.addFolder("Takshila Gemstone Selection");
        sectionFolder = app.project.items.addFolder("Sections");
        sectionFolder.parentFolder = rootFolder;
        assetFolder = app.project.items.addFolder("Stone images");
        assetFolder.parentFolder = rootFolder;

        var X = D.transition;
        var sections = [{ comp: buildIntro(D.intro + X), dur: D.intro }];
        for (var i = 0; i < GEMS.length; i++) sections.push({ comp: buildGemCard(GEMS[i], i, D.gem + X), dur: D.gem });
        sections.push({ comp: buildChecklist(D.checklist + X), dur: D.checklist });
        sections.push({ comp: buildOutro(D.outro), dur: D.outro });

        var total = 0;
        for (i = 0; i < sections.length; i++) total += sections[i].dur;

        var main = app.project.items.addComp("Takshila — Gemstone Selection (MAIN)", W, H, 1, total, CONFIG.fps);
        main.bgColor = [0, 0, 0];
        main.parentFolder = rootFolder;

        // Later sections sit above earlier ones and cross-fade in over the overlap.
        var t = 0;
        for (i = 0; i < sections.length; i++) {
            var l = main.layers.add(sections[i].comp);
            l.startTime = t;
            var op = tr(l, "ADBE Opacity");
            if (i > 0) { op.setValueAtTime(t, 0); op.setValueAtTime(t + X, 100); }
            if (i === sections.length - 1) { op.setValueAtTime(total - 0.8, 100); op.setValueAtTime(total, 0); }
            if (op.numKeys) easeAll(op);
            t += sections[i].dur;
        }

        app.project.renderQueue.items.add(main);
        main.openInViewer();
        return main;
    }

    app.beginUndoGroup("Build Takshila Gemstone Selection video");
    try {
        var main = build();
        var msg = "Built \"" + main.name + "\" (" + main.duration.toFixed(1) + "s, " + W + "x" + H + ").\n" +
            "It's in the Render Queue — set the output module and hit Render.";
        if (warnings.length) msg += "\n\nNotes:\n" + warnings.join("\n");
        alert(msg);
    } catch (e) {
        alert("Takshila script stopped: " + e.toString() + (e.line ? " (line " + e.line + ")" : ""));
    } finally {
        app.endUndoGroup();
    }
})();
