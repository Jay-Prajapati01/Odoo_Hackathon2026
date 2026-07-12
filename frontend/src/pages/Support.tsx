import React, { useState } from "react";
import { HelpCircle, Search, Mail, BookOpen, MessageSquare, AlertCircle, Save } from "lucide-react";
import { motion } from "motion/react";

export const Support: React.FC = () => {
  const [supportQuery, setSupportQuery] = useState("");
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketBody, setTicketBody] = useState("");

  const faqs = [
    {
      q: "How do I transfer a MacBook or phone to a team member?",
      a: "Navigate to the 'Allocation & Transfer' tab on the sidebar. Select the asset from your catalog list, select the recipient employee, pick a priority level, and submit the ledger form. Ownership will update instantly.",
    },
    {
      q: "How do I reserve Boardroom A1 or Delivery Van #2?",
      a: "Open the 'Resource Booking' tab on the sidebar. Click the 'Book Resource' button on the top right, select your target room or vehicle, specify start/end hours, and submit. The conflict engine prevents overlaps.",
    },
    {
      q: "What do I do if an asset is damaged or flickering?",
      a: "Go to the 'Maintenance' tab and click 'Raise Incident'. Search the asset tag, describe the symptoms (such as screen ghosting or battery swells), set the urgency, and a hardware specialist will be assigned.",
    },
  ];

  const filteredFaqs = faqs.filter(
    (faq) =>
      faq.q.toLowerCase().includes(supportQuery.toLowerCase()) ||
      faq.a.toLowerCase().includes(supportQuery.toLowerCase())
  );

  const handleTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject || !ticketBody) return;
    alert(`Support request submitted! Case ticket #${Math.floor(100000 + Math.random() * 900000)} generated. The IT desk will reach out.`);
    setTicketSubject("");
    setTicketBody("");
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* HEADER PAGE */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Help & Technical Support</h2>
        <p className="text-xs text-gray-500 mt-1">
          Review step-by-step user documentation, search FAQs, or open a technical support ticket directly with the IT desk.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* LEFT COLUMN: FAQS AND DOCUMENTS (SPAN 2) */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-1.5 pb-3 border-b border-gray-100">
              <BookOpen className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-black uppercase text-gray-800 tracking-wider">ERP User Guides</h3>
            </div>

            {/* FAQ Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search troubleshooting guides..."
                value={supportQuery}
                onChange={(e) => setSupportQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white transition-all"
              />
            </div>

            <div className="space-y-4 pt-2">
              {filteredFaqs.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No articles found matching your search.</p>
              ) : (
                filteredFaqs.map((faq, idx) => (
                  <div key={idx} className="p-4 bg-gray-50 border border-gray-100 rounded-xl space-y-1.5">
                    <h4 className="text-xs font-bold text-gray-950 flex items-start gap-1.5 leading-snug">
                      <HelpCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span>{faq.q}</span>
                    </h4>
                    <p className="text-xs text-gray-600 leading-relaxed pl-5.5 font-medium">{faq.a}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: TICKET SUBMISSION FORM (SPAN 1) */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm h-fit space-y-4">
          <div className="flex items-center gap-1.5 pb-3 border-b border-gray-100">
            <MessageSquare className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-black uppercase text-gray-800 tracking-wider">Open Ticket</h3>
          </div>

          <form onSubmit={handleTicketSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Support Subject
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Swollen battery replacement"
                value={ticketSubject}
                onChange={(e) => setTicketSubject(e.target.value)}
                className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Case Description / Issue
              </label>
              <textarea
                required
                rows={4}
                placeholder="Describe what help you need or trace details of the hardware."
                value={ticketBody}
                onChange={(e) => setTicketBody(e.target.value)}
                className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary focus:bg-white transition-all"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 uppercase tracking-wider"
            >
              <Mail className="w-4 h-4" />
              <span>Submit IT Request</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
