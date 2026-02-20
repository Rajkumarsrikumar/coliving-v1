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
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="mb-8 flex flex-col items-center gap-2">
            <img
              src="/logo.png"
              alt="CoTenanty - Co-Living Platform"
              className="h-36 w-auto object-contain"
            />
          </div>
          <Card className="border-0 shadow-xl bg-card">
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
      </div>
    </div>
  )
}
