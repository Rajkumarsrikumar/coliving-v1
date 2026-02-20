import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Moon, Sun } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { LoginForm } from '../features/auth/LoginForm'
import { SignUpForm } from '../features/auth/SignUpForm'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'

export function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const { signIn, signUp, user, loading } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && user) {
      navigate('/home', { replace: true })
    }
  }, [user, loading, navigate])

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="absolute right-4 top-4 z-10">
        <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
      </div>
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 280, damping: 22 }}
          className="w-full max-w-md"
        >
          <motion.div
            className="mb-8 flex flex-col items-center gap-2"
            initial={{ opacity: 0, scale: 0.7, rotate: -5 }}
            animate={{
              opacity: 1,
              scale: 1,
              rotate: 0,
              y: [0, -6, 0],
            }}
            transition={{
              opacity: { duration: 0.5 },
              scale: { type: 'spring', stiffness: 200, damping: 15, delay: 0.1 },
              rotate: { type: 'spring', stiffness: 150, damping: 12 },
              y: {
                duration: 3,
                repeat: Infinity,
                repeatType: 'reverse',
                ease: 'easeInOut',
                repeatDelay: 0.5,
              },
            }}
          >
            <img
              src="/logo.png"
              alt="CoTenanty - Co-Living Platform"
              className="h-36 w-auto object-contain drop-shadow-lg"
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.2 }}
            whileHover={{ scale: 1.02, y: -2, transition: { duration: 0.2 } }}
            className="relative"
          >
          <Card className="border-0 shadow-xl bg-card overflow-hidden relative hover:shadow-2xl hover:shadow-coral-500/10 transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="text-center">
                {isLogin ? 'Welcome back' : 'Create your account'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLogin ? (
                <LoginForm
                  onSubmit={async (email, password) => {
                    const { error } = await signIn(email, password)
                    return { error: error ? { message: error.message } : undefined }
                  }}
                  onSwitchToSignUp={() => setIsLogin(false)}
                  onForgotPassword={() => navigate('/forgot-password')}
                />
              ) : (
                <SignUpForm
                  onSubmit={async (email, password, name) => {
                    const { error } = await signUp(email, password, name)
                    return { error: error ? { message: error.message } : undefined }
                  }}
                  onSwitchToLogin={() => setIsLogin(true)}
                />
              )}
            </CardContent>
          </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
