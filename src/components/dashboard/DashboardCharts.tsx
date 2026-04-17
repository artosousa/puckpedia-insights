import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { BarChart3, Activity, Target } from "lucide-react";
import type { Viewing } from "@/hooks/useScoutingData";

const COLORS = ["hsl(16, 78%, 57%)", "hsl(38, 80%, 60%)", "hsl(200, 60%, 55%)", "hsl(140, 50%, 50%)", "hsl(280, 50%, 60%)"];

const avg = (nums: (number | null)[]) => {
  const valid = nums.filter((n): n is number => n != null);
  return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : 0;
};

export const DashboardCharts = ({ viewings }: { viewings: Viewing[] }) => {
  const radarData = useMemo(() => [
    { attr: "Skating", value: +avg(viewings.map((v) => v.rating_skating)).toFixed(1) },
    { attr: "Shot", value: +avg(viewings.map((v) => v.rating_shot)).toFixed(1) },
    { attr: "Hands", value: +avg(viewings.map((v) => v.rating_hands)).toFixed(1) },
    { attr: "IQ", value: +avg(viewings.map((v) => v.rating_iq)).toFixed(1) },
    { attr: "Compete", value: +avg(viewings.map((v) => v.rating_compete)).toFixed(1) },
    { attr: "Physical", value: +avg(viewings.map((v) => v.rating_physicality)).toFixed(1) },
  ], [viewings]);

  const trendData = useMemo(() => {
    const byMonth: Record<string, { count: number; total: number; n: number }> = {};
    viewings.forEach((v) => {
      const d = new Date(v.game_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!byMonth[key]) byMonth[key] = { count: 0, total: 0, n: 0 };
      byMonth[key].count += 1;
      if (v.rating_overall != null) {
        byMonth[key].total += v.rating_overall;
        byMonth[key].n += 1;
      }
    });
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, { count, total, n }]) => ({
        month: new Date(`${key}-01`).toLocaleDateString(undefined, { month: "short" }),
        viewings: count,
        avgRating: n ? +(total / n).toFixed(1) : 0,
      }));
  }, [viewings]);

  const projectionData = useMemo(() => {
    const counts: Record<string, number> = {};
    viewings.forEach((v) => {
      const k = v.projection ?? "Unrated";
      counts[k] = (counts[k] ?? 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [viewings]);

  if (viewings.length === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="glass-card rounded-xl p-6"
      >
        <h3 className="font-heading text-base font-semibold flex items-center gap-2 mb-4">
          <Target className="w-4 h-4 text-primary" />
          Average Ratings
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis dataKey="attr" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
            <PolarRadiusAxis domain={[0, 10]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
            <Radar dataKey="value" stroke="hsl(16, 78%, 57%)" fill="hsl(16, 78%, 57%)" fillOpacity={0.4} />
          </RadarChart>
        </ResponsiveContainer>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="glass-card rounded-xl p-6"
      >
        <h3 className="font-heading text-base font-semibold flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-primary" />
          Viewings Trend
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
            <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--surface-elevated))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Line type="monotone" dataKey="viewings" stroke="hsl(16, 78%, 57%)" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="avgRating" stroke="hsl(38, 80%, 60%)" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="glass-card rounded-xl p-6"
      >
        <h3 className="font-heading text-base font-semibold flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-primary" />
          Projection Mix
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={projectionData} dataKey="value" nameKey="name" outerRadius={70} innerRadius={40}>
              {projectionData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--surface-elevated))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  );
};
