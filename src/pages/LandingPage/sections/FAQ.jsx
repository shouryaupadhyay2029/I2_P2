import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AxisMarker } from "../../../components/layout/AxisMarker";
import { cn } from "../../../utils/cn";

const ease = [0.16, 1, 0.3, 1];

const faqs = [
  {
    id: "Q.01",
    question: "Is NovaEvent available for teams and organizations?",
    answer: "Yes. The platform is architected to support multiple organizations simultaneously, providing secure, isolated workspaces while maintaining a unified directory."
  },
  {
    id: "Q.02",
    question: "How does the registration system handle high-demand events?",
    answer: "Our infrastructure automatically scales during peak registration windows, incorporating a fair-queue waitlist system to ensure stability under heavy load."
  },
  {
    id: "Q.03",
    question: "Can organizers integrate custom branding?",
    answer: "NovaEvent is designed to be visually quiet. Organizers provide high-quality event photography and metadata, and the system automatically conforms it to the premium global design language."
  }
];

export const FAQ = () => {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section className="w-full flex flex-col mb-32 pt-24">
      <AxisMarker index="07" label="Index & Inquiries" />
      
      <div className="grid grid-cols-1 md:grid-cols-12 gap-16 md:gap-8 max-w-[1200px] w-full">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.8, ease }}
          className="col-span-1 md:col-span-5"
        >
          <h2 className="text-[2.5rem] font-display text-primary tracking-tight max-w-xs leading-[0.9]">
            Common Inquiries
          </h2>
        </motion.div>
        
        <div className="col-span-1 md:col-span-7 flex flex-col border-t border-border">
          {faqs.map((faq, index) => (
            <motion.div 
              key={faq.id} 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ duration: 0.8, delay: index * 0.1, ease }}
              className="border-b border-border"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? -1 : index)}
                aria-expanded={openIndex === index}
                className="w-full py-8 flex justify-between items-center text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-8 focus-visible:ring-offset-background rounded-none group"
              >
                <div className="flex items-center gap-6">
                  <span className="text-[0.65rem] text-muted tracking-[0.25em] font-technical">{faq.id}</span>
                  <span className={cn(
                    "text-xl font-display transition-colors duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] pr-8 tracking-tight",
                    openIndex === index ? "text-primary" : "text-secondary group-hover:text-primary"
                  )}>
                    {faq.question}
                  </span>
                </div>
                
                {/* Precision Accent Tool */}
                <span className={cn(
                  "text-xl font-light transform transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
                  openIndex === index ? "text-accent rotate-180" : "text-muted group-hover:text-primary"
                )}>
                  {openIndex === index ? "−" : "+"}
                </span>
              </button>
              
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.6, ease }}
                    className="overflow-hidden pl-16"
                  >
                    <p className="pb-10 text-body text-secondary font-light max-w-lg leading-relaxed">
                      {faq.answer}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
