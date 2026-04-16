import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const CTASection = () => {
  return (
    <section className="py-24 relative">
      <div className="container px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mx-auto text-center"
        >
          <h2 className="font-heading text-3xl md:text-5xl font-bold mb-4">
            Ready to scout <span className="text-gradient-ember">smarter</span>?
          </h2>
          <p className="text-muted-foreground text-lg mb-10">
            Join scouts who've ditched the spreadsheets. Free for your first 50 evaluations.
          </p>
          <Button variant="hero" size="lg" className="text-base px-8 py-6">
            Get Started Free
            <ArrowRight className="w-5 h-5 ml-1" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
