import { motion } from "framer-motion";
import { useState } from "react";
import {
  TrendingUp,
  Target,
  Zap,
  Eye,
  Sparkles,
  Image as ImageIcon,
  Video,
  Palette,
  PlayCircle,
} from "lucide-react";

const stats = [
  { label: "Skating", value: 8.5, icon: Zap },
  { label: "Shooting", value: 7.0, icon: Target },
  { label: "Hockey IQ", value: 9.0, icon: Eye },
  { label: "Compete", value: 8.0, icon: TrendingUp },
];

const mediaTags = ["Skating", "Edge Work", "Zone Entry"];

const aiObservations = [
  "Strong inside-edge load on first three strides — explosive jump.",
  "Hands stay outside the frame on the entry — protects puck well.",
];

const aiImprovements = [
  "Heel-to-heel pivots on D-zone exits look stiff.",
  "Shot release from the slot lacks weight transfer.",
];

const PreviewSection = () => {
  return (
    <section className="py-24 relative">
      <div className="container px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-6xl mx-auto"
        >
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-3">
              Built for the modern scout
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Player profiles, viewing notes, AI film breakdowns, and a workspace tuned to your eye.
            </p>
          </div>

          {/* Bento grid */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 md:gap-5">
            {/* Player profile + ratings (large) */}
            <div className="md:col-span-4 glass-card rounded-2xl p-6 md:p-8 glow-ember">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-14 h-14 rounded-xl bg-primary/15 flex items-center justify-center">
                  <span className="font-heading text-xl font-bold text-primary">#17</span>
                </div>
                <div className="min-w-0">
                  <h3 className="font-heading text-xl font-bold truncate">Connor Sample</h3>
                  <p className="text-sm text-muted-foreground truncate">
                    C · London Knights · OHL · 6'1" · 185lbs
                  </p>
                </div>
                <span className="ml-auto px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-medium whitespace-nowrap">
                  2026 Draft
                </span>
              </div>

              <div className="space-y-3.5">
                {stats.map((stat) => (
                  <div key={stat.label} className="flex items-center gap-3">
                    <stat.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium w-24">{stat.label}</span>
                    <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${stat.value * 10}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
                        className="h-full rounded-full bg-primary"
                      />
                    </div>
                    <span className="text-sm font-heading font-semibold text-primary w-8 text-right">
                      {stat.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Scout notes */}
            <div className="md:col-span-2 glass-card rounded-2xl p-6 flex flex-col">
              <h4 className="font-heading text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Scout Notes
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                Exceptional edge work and acceleration. Plays at high speed. Needs a better release from the slot. Always finds open ice.
              </p>
              <div className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border/50">
                Viewed Apr 12, 2026 · vs Saginaw
              </div>
            </div>

            {/* Media upload card */}
            <div className="md:col-span-3 glass-card rounded-2xl p-6 overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-heading text-sm font-semibold flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-primary" />
                  Player Media
                </h4>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  3 clips · 7 photos
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="aspect-video rounded-lg bg-gradient-to-br from-primary/30 to-primary/5 border border-border/50 relative flex items-center justify-center group">
                  <PlayCircle className="w-8 h-8 text-primary/90" />
                  <span className="absolute bottom-1 right-1.5 text-[9px] bg-black/60 text-white px-1 rounded">
                    0:24
                  </span>
                </div>
                <div className="aspect-video rounded-lg bg-gradient-to-tr from-surface-sunken to-primary/15 border border-border/50 flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="aspect-video rounded-lg bg-gradient-to-bl from-primary/20 to-surface-sunken border border-border/50 relative flex items-center justify-center">
                  <Video className="w-6 h-6 text-muted-foreground" />
                  <span className="absolute bottom-1 right-1.5 text-[9px] bg-black/60 text-white px-1 rounded">
                    0:18
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {mediaTags.map((t) => (
                  <span
                    key={t}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30"
                  >
                    {t}
                  </span>
                ))}
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                  + 4 more
                </span>
              </div>
            </div>

            {/* AI analysis card */}
            <div className="md:col-span-3 glass-card rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
              <div className="flex items-center justify-between mb-4 relative">
                <h4 className="font-heading text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  AI Film Breakdown
                </h4>
                <span className="text-[10px] uppercase tracking-wider text-primary">
                  1st Line
                </span>
              </div>

              <div className="space-y-3 relative">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                    Observations
                  </p>
                  <ul className="space-y-1">
                    {aiObservations.map((line, i) => (
                      <li key={i} className="text-xs text-foreground/85 leading-relaxed flex gap-1.5">
                        <span className="text-primary">•</span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                    Areas to Improve
                  </p>
                  <ul className="space-y-1">
                    {aiImprovements.map((line, i) => (
                      <li key={i} className="text-xs text-foreground/85 leading-relaxed flex gap-1.5">
                        <span className="text-primary">•</span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="pt-2 border-t border-border/40">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    Recommended Drill
                  </p>
                  <p className="text-xs text-foreground/85">
                    Heel-to-heel pivots →{" "}
                    <span className="text-primary underline-offset-2 underline cursor-pointer">
                      ▶ Watch on YouTube
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Theme customizer mini card */}
            <div className="md:col-span-2 glass-card rounded-2xl p-6">
              <h4 className="font-heading text-sm font-semibold flex items-center gap-2 mb-3">
                <Palette className="w-4 h-4 text-primary" />
                Your Theme
              </h4>
              <p className="text-xs text-muted-foreground mb-4">
                Make the rink your own — every color, fully editable.
              </p>
              <ThemeSwatches />
              <p className="text-[10px] text-muted-foreground/70 mt-3">
                Click a color to preview it across the site.
              </p>
            </div>

            {/* Watchlist mini stat */}
            <div className="md:col-span-2 glass-card rounded-2xl p-6">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                Watchlist
              </p>
              <p className="font-heading text-3xl font-bold">
                42 <span className="text-base text-muted-foreground font-normal">players</span>
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Across 6 leagues · 14 tagged "Top-30"
              </p>
            </div>

            {/* Viewings stat */}
            <div className="md:col-span-2 glass-card rounded-2xl p-6">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                Viewings this month
              </p>
              <p className="font-heading text-3xl font-bold text-primary">
                23
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                +8 vs last month · 3 with film
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const THEME_SWATCHES: { label: string; primary: string; accent: string }[] = [
  { label: "Ember",   primary: "16 78% 57%",  accent: "20 65% 50%" },
  { label: "Ice",     primary: "210 90% 60%", accent: "200 80% 50%" },
  { label: "Turf",    primary: "150 60% 45%", accent: "160 55% 40%" },
  { label: "Royal",   primary: "265 75% 62%", accent: "280 60% 55%" },
  { label: "Sunset",  primary: "340 80% 60%", accent: "12 85% 60%" },
];

function ThemeSwatches() {
  const [active, setActive] = useState(0);
  const apply = (i: number) => {
    const s = THEME_SWATCHES[i];
    const root = document.documentElement;
    root.style.setProperty("--primary", s.primary);
    root.style.setProperty("--accent", s.accent);
    root.style.setProperty("--ring", s.primary);
    setActive(i);
  };
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {THEME_SWATCHES.map((s, i) => (
        <button
          key={s.label}
          type="button"
          onClick={() => apply(i)}
          aria-label={`Apply ${s.label} theme`}
          className={`aspect-square rounded-md border transition-all ${
            active === i
              ? "border-foreground ring-2 ring-foreground/40 scale-105"
              : "border-border/50 hover:scale-105 hover:border-border"
          }`}
          style={{ background: `hsl(${s.primary})` }}
        />
      ))}
    </div>
  );
}

export default PreviewSection;
