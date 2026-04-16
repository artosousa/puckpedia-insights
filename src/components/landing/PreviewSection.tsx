import { motion } from "framer-motion";
import { TrendingUp, Target, Zap, Eye } from "lucide-react";

const stats = [
  { label: "Skating", value: 8.5, icon: Zap },
  { label: "Shooting", value: 7.0, icon: Target },
  { label: "Hockey IQ", value: 9.0, icon: Eye },
  { label: "Compete", value: 8.0, icon: TrendingUp },
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
          className="max-w-4xl mx-auto"
        >
          {/* Mock scouting card */}
          <div className="glass-card rounded-2xl p-8 glow-ember">
            <div className="flex flex-col md:flex-row gap-8">
              {/* Player info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 rounded-xl bg-primary/15 flex items-center justify-center">
                    <span className="font-heading text-xl font-bold text-primary">#17</span>
                  </div>
                  <div>
                    <h3 className="font-heading text-xl font-bold">Connor Sample</h3>
                    <p className="text-sm text-muted-foreground">C · London Knights · OHL · 6'1" · 185lbs</p>
                  </div>
                </div>

                <div className="space-y-4 mt-6">
                  {stats.map((stat) => (
                    <div key={stat.label} className="flex items-center gap-3">
                      <stat.icon className="w-4 h-4 text-muted-foreground" />
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

              {/* Notes */}
              <div className="md:w-64 space-y-3">
                <h4 className="font-heading text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Scout Notes
                </h4>
                <div className="rounded-lg bg-surface-sunken p-4 text-sm text-muted-foreground leading-relaxed">
                  Exceptional edge work and acceleration. Makes plays at high speed. Needs to improve shot release from the slot. High-end hockey sense — always finds open ice.
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">2026 Draft</span>
                  <span>·</span>
                  <span>Viewed Apr 12, 2026</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default PreviewSection;
