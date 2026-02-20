import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Info, Mail, MessageCircle, Linkedin } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'

export function AboutUsPage() {
  return (
    <div className="flex flex-1 flex-col p-4 sm:p-6">
      <Link
        to="/home"
        className="mb-4 text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to home
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto w-full max-w-md"
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-coral-500" />
              About Us
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              CoTenanty is built to simplify shared living expenses. Here’s a bit about the developer.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <h3 className="font-semibold text-foreground">Rajkumar Srikumar</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">He/Him</p>
              <p className="mt-1 text-sm font-medium text-coral-600 dark:text-coral-500">
                AI Enthusiast | BizApp | 7x Microsoft Certified | Power Platform & RPA Certified Solution Architect and Trainer
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                With a seasoned perspective on software development, I am driven by the pursuit of crafting elegant solutions to complex, real-world challenges. From enterprise-grade low-code platforms to bespoke applications, I approach each endeavour with rigour and a commitment to delivering impactful, user-centric products. CoTenanty exemplifies this ethos—continuously refined and open to collaborative feedback.
              </p>
              <a
                href="https://www.linkedin.com/in/rajkumar-srikumar/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-coral-600 hover:text-coral-700 hover:underline dark:text-coral-500 dark:hover:text-coral-400"
              >
                <Linkedin className="h-4 w-4" />
                View on LinkedIn
              </a>
            </div>

            <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
              <p className="mb-3 text-sm font-medium text-foreground">Contact for app improvement</p>
              <p className="mb-3 text-xs text-muted-foreground">
                Feedback or suggestions? Reach out via email or WhatsApp.
              </p>
              <div className="space-y-2">
                <a
                  href="mailto:rajkumar.0078@gmail.com"
                  className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-coral-300 hover:bg-coral-50/30 hover:text-foreground dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-coral-700 dark:hover:bg-coral-950/20"
                >
                  <Mail className="h-5 w-5 shrink-0 text-coral-500" />
                  rajkumar.0078@gmail.com
                </a>
                <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                  <a
                    href="https://wa.me/6594696745"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-green-300 hover:bg-green-50/30 hover:text-foreground dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-green-700 dark:hover:bg-green-950/20"
                  >
                    <MessageCircle className="h-5 w-5 shrink-0 text-green-600 dark:text-green-500" />
                    <span>+65 9469 6745</span>
                  </a>
                  <a
                    href="https://wa.me/918667052847"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-green-300 hover:bg-green-50/30 hover:text-foreground dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-green-700 dark:hover:bg-green-950/20"
                  >
                    <MessageCircle className="h-5 w-5 shrink-0 text-green-600 dark:text-green-500" />
                    <span>+91 86670 52847</span>
                  </a>
                </div>
                <p className="text-xs text-muted-foreground">
                  Available on WhatsApp for both numbers.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
