(function (global) {
  "use strict";

  function preprocess(raw) {
    let s = String(raw).trim();
    s = s.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-");
    s = s.replace(/\u2212/g, "-");
    s = s.replace(/\*\*/g, "^");
    s = s.replace(/\bAND\b/gi, " and ");
    s = s.replace(/\bOR\b/gi, " or ");
    s = s.replace(/\bXOR\b/gi, " xor ");
    s = s.replace(/\bNOT\b/gi, " not ");
    s = s.replace(/&&/g, " and ");
    s = s.replace(/\|\|/g, " or ");
    s = s.replace(/(\d+(?:\.\d+)?)\s*%/g, "($1/100)");
    s = s.replace(/(\d+(?:\.\d+)?)([a-zA-Z])/g, "$1*$2");
    s = s.replace(/(\d+(?:\.\d+)?)\s*\(/g, "$1*(");
    s = s.replace(/\)\s*(\d)/g, ")*$1");
    s = s.replace(/\)\s*\(/g, ")*(");
    s = s.replace(/\)\s*([a-zA-Z])/g, ")*$1");
    return s;
  }

  function tokenize(s) {
    const tokens = [];
    let i = 0;
    const isLetter = (c) => /[a-zA-Z]/.test(c);
    const isDigit = (c) => /[0-9]/.test(c);
    while (i < s.length) {
      const c = s[i];
      if (c === " " || c === "\t") { i++; continue; }
      if (isDigit(c) || (c === "." && isDigit(s[i + 1] || ""))) {
        let n = "";
        while (i < s.length && (isDigit(s[i]) || s[i] === ".")) n += s[i++];
        if (n === "." || n.split(".").length > 2) throw new Error("Bad number: " + n);
        tokens.push({ t: "num", v: parseFloat(n) });
        continue;
      }
      if (isLetter(c)) {
        let id = "";
        while (i < s.length && isLetter(s[i])) id += s[i++];
        tokens.push({ t: "id", v: id.toLowerCase() });
        continue;
      }
      if ("+-*/^(),=".includes(c)) {
        tokens.push({ t: c });
        i++;
        continue;
      }
      if (c === "!") { tokens.push({ t: "id", v: "not" }); i++; continue; }
      throw new Error("Unknown symbol: " + c);
    }
    tokens.push({ t: "end" });
    return tokens;
  }

  function parse(tokens, vars) {
    let p = 0;
    const peek = () => tokens[p];
    const eat = (t) => {
      if (peek().t !== t) throw new Error("Expected " + t);
      p++;
    };

    function expr() {
      let left = orExpr();
      while (peek().t === "id" && peek().v === "or") {
        p++;
        const right = orExpr();
        left = (left ? 1 : 0) || (right ? 1 : 0) ? 1 : 0;
      }
      return left;
    }
    function orExpr() {
      let left = xorExpr();
      while (peek().t === "id" && peek().v === "xor") {
        p++;
        const right = xorExpr();
        left = ((left ? 1 : 0) !== (right ? 1 : 0)) ? 1 : 0;
      }
      return left;
    }
    function xorExpr() {
      let left = andExpr();
      while (peek().t === "id" && peek().v === "and") {
        p++;
        const right = andExpr();
        left = (left ? 1 : 0) && (right ? 1 : 0) ? 1 : 0;
      }
      return left;
    }
    function andExpr() {
      let left = add();
      while (peek().t === "+" || peek().t === "-") {
        const op = peek().t; p++;
        const right = add();
        left = op === "+" ? left + right : left - right;
      }
      return left;
    }
    function add() {
      let left = pow();
      while (peek().t === "*" || peek().t === "/") {
        const op = peek().t; p++;
        const right = pow();
        if (op === "/" && right === 0) throw new Error("Division by zero");
        left = op === "*" ? left * right : left / right;
      }
      return left;
    }
    function pow() {
      let left = unary();
      if (peek().t === "^") {
        p++;
        const right = pow();
        left = Math.pow(left, right);
      }
      return left;
    }
    function unary() {
      if (peek().t === "-") { p++; return -unary(); }
      if (peek().t === "+") { p++; return unary(); }
      if (peek().t === "id" && peek().v === "not") { p++; return unary() ? 0 : 1; }
      return primary();
    }
    function primary() {
      if (peek().t === "num") { const v = peek().v; p++; return v; }
      if (peek().t === "(") {
        p++;
        const v = expr();
        eat(")");
        return v;
      }
      if (peek().t === "id") {
        const name = peek().v; p++;
        if (name === "pi") return Math.PI;
        if (name === "e") return Math.E;
        if (peek().t === "(") {
          p++;
          const args = [expr()];
          while (peek().t === ",") { p++; args.push(expr()); }
          eat(")");
          return callFn(name, args);
        }
        if (Object.prototype.hasOwnProperty.call(vars, name)) return vars[name];
        throw new Error("Unknown name: " + name + ". For algebra, use Solve for x.");
      }
      throw new Error("Unexpected " + peek().t);
    }
    const value = expr();
    return { value, p };
  }

  function callFn(name, args) {
    const a = args[0];
    switch (name) {
      case "sqrt": if (a < 0) throw new Error("Square root of a negative"); return Math.sqrt(a);
      case "abs": return Math.abs(a);
      case "round": return Math.round(a);
      case "floor": return Math.floor(a);
      case "ceil": return Math.ceil(a);
      case "log": return Math.log10(a);
      case "log2": return Math.log2(a);
      case "ln": return Math.log(a);
      case "pow": return Math.pow(a, args[1]);
      case "min": return Math.min(a, args[1]);
      case "max": return Math.max(a, args[1]);
      case "sin": return Math.sin(a);
      case "cos": return Math.cos(a);
      case "tan": return Math.tan(a);
      default: throw new Error("Unknown function: " + name);
    }
  }

  function evaluate(raw, vars) {
    const s = preprocess(raw);
    if (!s) throw new Error("Type a formula");
    if (s.includes("=")) throw new Error("Use Solve for x for equations with =");
    const tokens = tokenize(s);
    const { value, p } = parse(tokens, vars || {});
    if (tokens[p].t !== "end") throw new Error("Could not read the whole formula");
    if (!Number.isFinite(value)) throw new Error("Result is not a real number");
    return value;
  }

  function formatNum(n) {
    if (typeof n !== "number" || !Number.isFinite(n)) return String(n);
    if (Math.abs(n - Math.round(n)) < 1e-10) return String(Math.round(n));
    let s = n.toPrecision(10);
    if (s.includes("e")) return String(n);
    s = s.replace(/\.?0+$/, "");
    return s;
  }

  function solveLinear(raw) {
    let s = preprocess(raw);
    const parts = s.split("=");
    if (parts.length !== 2) throw new Error("Equation needs one equals sign, like 3x+7=22");
    const letters = [...new Set((s.match(/[a-zA-Z]+/g) || []).map((x) => x.toLowerCase()))]
      .filter((w) => !["and", "or", "xor", "not", "sqrt", "abs", "log", "log2", "ln", "pow", "min", "max", "sin", "cos", "tan", "pi", "e", "round", "floor", "ceil"].includes(w));
    if (letters.length !== 1) throw new Error("Use one letter as the unknown, usually x");
    const v = letters[0];
    const left = parts[0];
    const right = parts[1];
    const f = (x) => evaluate(left, { [v]: x }) - evaluate(right, { [v]: x });
    const f0 = f(0);
    const f1 = f(1);
    const slope = f1 - f0;
    if (Math.abs(slope) < 1e-12) {
      if (Math.abs(f0) < 1e-12) throw new Error("Every number works (identity)");
      throw new Error("No solution (parallel / contradiction)");
    }
    const x = -f0 / slope;
    if (Math.abs(f(x)) > 1e-6) throw new Error("This looks nonlinear. Try a number formula instead.");
    return { variable: v, value: x };
  }

  function parseIntAuto(s) {
    const t = String(s).trim().replace(/\s+/g, "");
    if (!t) throw new Error("Enter a number");
    if (/^0x[0-9a-f]+$/i.test(t) || /^[0-9a-f]+h$/i.test(t)) {
      return parseInt(t.replace(/h$/i, "").replace(/^0x/i, ""), 16);
    }
    if (/^[01]+b$/i.test(t) || /^0b[01]+$/i.test(t)) {
      return parseInt(t.replace(/b$/i, "").replace(/^0b/i, ""), 2);
    }
    if (/^[01]{2,}$/.test(t)) return parseInt(t, 2);
    if (/^[0-9]+$/.test(t)) return parseInt(t, 10);
    if (/^[0-9a-f]+$/i.test(t) && /[a-f]/i.test(t)) return parseInt(t, 16);
    throw new Error("Use decimal (192), binary (11000000), or hex (C0 or 0xC0)");
  }

  function toBinary(n) {
    const v = n >>> 0;
    let b = v.toString(2);
    while (b.length % 4) b = "0" + b;
    return b.replace(/(.{4})/g, "$1 ").trim();
  }

  function subnet(prefix) {
    const p = Number(prefix);
    if (!Number.isInteger(p) || p < 0 || p > 32) throw new Error("Prefix must be 0–32, like 24");
    const hostBits = 32 - p;
    const total = hostBits === 32 ? 4294967296 : 2 ** hostBits;
    let maskOctets = [];
    let bits = p;
    for (let i = 0; i < 4; i++) {
      const take = Math.max(0, Math.min(8, bits));
      maskOctets.push(take === 0 ? 0 : 256 - 2 ** (8 - take));
      bits -= take;
    }
    let usable;
    let note = "";
    if (p === 32) { usable = 1; note = "Single host."; }
    else if (p === 31) { usable = 2; note = "Point-to-point (/31) — often 2 usable, no broadcast."; }
    else { usable = total - 2; note = "Minus network and broadcast."; }
    return {
      prefix: p,
      hostBits,
      total,
      usable,
      mask: maskOctets.join("."),
      note,
    };
  }

  const BYTE_UNITS = { b: 1 / 8, B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 };
  const BIT_UNITS = { b: 1, Kbps: 1000, Mbps: 1e6, Gbps: 1e9 };

  global.GetNowCalc = {
    evaluate,
    formatNum,
    solveLinear,
    parseIntAuto,
    toBinary,
    subnet,
    BYTE_UNITS,
    BIT_UNITS,
  };
})(typeof window !== "undefined" ? window : globalThis);
