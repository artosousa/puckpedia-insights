import { motion } from "framer-motion";
import { ClipboardList, BarChart3, Users, Share2, Smartphone, Star } from "lucide-react";

const features = [
  {
    icon: ClipboardList,
    title: "Quick Evaluations",
    description: "Log skating, shooting, hockey IQ, compete level and more in seconds from the stands.",
    span: "col-span-1 md:col-span-2",
  },
  {
    icon: BarChart3,
    title: "Development Tracking",
    description: "Watch prospects evolve over time with visual progression charts and comparison tools.",
    span: "col-span-1 md:col-span-4",
  },
  {
    icon: Users,
    title: "Player Database",
    description: "Build your personal prospect database across leagues — CHL, USHL, NCAA, European leagues.",
    span: "col-span-1 md:col-span-4",
  },
  {
    icon: Share2,
    title: "Share Reports",
    description: "Generate and share professional scouting reports with your staff or organization.",
    span: "col-span-1 md:col-span-2",
  },
  {
    icon: Smartphone,
    title: "Rinkside Ready",
    description: "Mobile-first design built for use at the rink. Works offline and syncs when you're back.",
    span: "col-span-1 md:col-span-3",
  },
  {
    icon: Star,
    title: "Prospect Rankings",
    description: "Create tiered watch lists and draft boards with your own custom ranking system.",
    span: "col-span-1 md:col-span-3",
  },
];

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

const FeaturesSection = () => {
  return (
    <section className="py-24 relative">
      <div className="container px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="font-heading text-3xl md:text-5xl font-bold mb-4">
            Everything a scout needs
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Purpose-built tools that replace scattered notebooks, spreadsheets, and memory.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-6 gap-4 max-w-5xl mx-auto"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={item}
              className={`glass-card rounded-xl p-6 hover:border-primary/30 transition-all duration-300 group ${feature.span}`}
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-heading text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;
