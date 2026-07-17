"use client";

import { motion } from "framer-motion";
import { MessageCircle, Send, Heart, Megaphone, Map, Lightbulb } from "lucide-react";
import { GitHubIcon } from "@/components/ui/icons";

const communityLinks = [
  {
    icon: Send,
    name: "Telegram",
    desc: "Обсуждения, вопросы и оперативная помощь",
    href: "https://t.me/sip_security_platform",
    color: "#26A5E4",
    members: "1.8K",
  },
  {
    icon: MessageCircle,
    name: "Discord",
    desc: "Живое общение с командой и сообществом",
    href: "https://discord.gg/sip-security",
    color: "#5865F2",
    members: "2.4K",
  },
  {
    icon: GitHubIcon,
    name: "GitHub",
    desc: "Исходный код, issues и вклад в развитие",
    href: "https://github.com/Ksander215/sec-scanner-workspace",
    color: "#e8e8ed",
    members: "340",
  },
  {
    icon: Map,
    name: "Дорожная карта",
    desc: "Голосуйте за новые функции и следите за развитием",
    href: "/app/community/roadmap",
    color: "#00ff88",
    members: "—",
  },
  {
    icon: Heart,
    name: "Вклад в проект",
    desc: "Узнайте, как внести свой вклад в развитие SIP",
    href: "/app/community/contributing",
    color: "#ff4444",
    members: "15+",
  },
  {
    icon: Lightbulb,
    name: "Предложить функцию",
    desc: "Расскажите, чего вам не хватает",
    href: "/app/community/feature-requests",
    color: "#ffb800",
    members: "—",
  },
];

export function Community() {
  return (
    <section id="community" className="relative py-24 sm:py-32 bg-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto"
        >
          <span className="text-sm font-medium text-accent uppercase tracking-wider">
            Community
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Сообщество
          </h2>
          <p className="mt-6 text-lg text-muted-2 leading-relaxed">
            Присоединяйтесь к сообществу специалистов по безопасности
          </p>
        </motion.div>

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {communityLinks.map((link, i) => (
            <motion.a
              key={link.name}
              href={link.href}
              target={link.href.startsWith("http") ? "_blank" : undefined}
              rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="group flex items-start gap-4 p-5 rounded-2xl border border-border bg-background hover:bg-surface-2 hover:border-border-light transition-all duration-300"
            >
              <div
                className="flex items-center justify-center w-11 h-11 rounded-xl shrink-0"
                style={{ backgroundColor: `${link.color}15` }}
              >
                <link.icon className="w-5 h-5" style={{ color: link.color }} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-foreground group-hover:text-accent transition-colors">
                    {link.name}
                  </h3>
                  {link.members !== "—" && (
                    <span className="text-xs font-mono text-muted">{link.members}</span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-2">{link.desc}</p>
              </div>
            </motion.a>
          ))}
        </div>

        {/* Open source banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 p-8 rounded-2xl border border-accent-border bg-accent-muted text-center"
        >
          <h3 className="text-xl font-semibold text-foreground mb-2">
            SIP — проект с открытым исходным кодом
          </h3>
          <p className="text-sm text-muted-2 max-w-xl mx-auto leading-relaxed">
            Вносите свой вклад, предлагайте идеи, помогайте развивать платформу.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <a
              href="https://github.com/Ksander215/sec-scanner-workspace"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-accent text-background rounded-xl hover:bg-accent-hover transition-colors"
            >
              <GitHubIcon className="w-4 h-4" /> Star on GitHub
            </a>
            <a
              href="/app/community/contributing"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium border border-border-light text-foreground rounded-xl hover:bg-surface-2 transition-colors"
            >
              <Heart className="w-4 h-4" /> Вклад в проект
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
