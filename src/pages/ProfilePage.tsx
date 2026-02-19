import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { User, ImagePlus, X, Phone } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Label } from '../components/ui/Label'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE_MB = 2

export function ProfilePage() {
  const { user, profile, updateProfile } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(profile?.name || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(profile?.avatar_url || null)
  const [imageRemoved, setImageRemoved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (profile) {
      setName(profile.name || '')
      setPhone(profile.phone || '')
      if (!selectedFile) {
        setPreviewUrl(imageRemoved ? null : (profile.avatar_url || null))
      }
    }
  }, [profile?.id])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        setError('Please upload a valid image (JPEG, PNG, WebP, or GIF)')
        return
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(`Image must be under ${MAX_SIZE_MB}MB`)
        return
      }
      setError(null)
      setImageRemoved(false)
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const clearFile = () => {
    setSelectedFile(null)
    setImageRemoved(true)
    if (previewUrl && previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setError(null)
    setSuccess(false)
    setSaving(true)

    try {
      let avatarUrl: string | null = imageRemoved ? null : (profile?.avatar_url || null)

      if (selectedFile) {
        const ext = selectedFile.name.split('.').pop() || 'jpg'
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`
        const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, selectedFile, {
          cacheControl: '3600',
          upsert: true,
        })
        if (uploadErr) throw new Error(uploadErr.message)
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
        avatarUrl = urlData.publicUrl
      }

      const { error: updateErr } = await updateProfile({
        name: name.trim() || undefined,
        avatar_url: avatarUrl ?? undefined,
        phone: phone.trim() || undefined,
      })
      if (updateErr) throw updateErr
      setSuccess(true)
      setSelectedFile(null)
      if (previewUrl && previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(avatarUrl)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col p-4 sm:p-6">
      <Link to="/home" className="mb-4 text-sm text-muted-foreground hover:text-foreground">
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
              <User className="h-5 w-5" />
              Your profile
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Update your name and profile photo. This is shown to your unit members.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-lg bg-green-50 p-3 text-sm text-green-600 dark:bg-green-900/20 dark:text-green-400">
                  Profile updated successfully!
                </div>
              )}

              <div className="space-y-2">
                <Label>Profile photo</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_IMAGE_TYPES.join(',')}
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {previewUrl ? (
                      <>
                        <img
                          src={previewUrl}
                          alt="Avatar"
                          className="h-20 w-20 rounded-full border-2 border-slate-200 object-cover dark:border-slate-700"
                        />
                        <button
                          type="button"
                          onClick={clearFile}
                          className="absolute -right-1 -top-1 rounded-full bg-slate-900/70 p-1 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                          aria-label="Remove photo"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </>
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
                        <User className="h-10 w-10 text-slate-400" />
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-coral-300 hover:bg-coral-50/50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-coral-700 dark:hover:bg-coral-950/20"
                  >
                    <ImagePlus className="h-4 w-4" />
                    {previewUrl ? 'Change photo' : 'Upload photo'}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">JPEG, PNG, WebP or GIF. Max {MAX_SIZE_MB}MB.</p>
                {error && error.includes('image') && <p className="text-sm text-red-500">{error}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-name">Display name</Label>
                <Input
                  id="profile-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. John Tan"
                />
                <p className="text-xs text-muted-foreground">
                  This name appears in unit members, expenses, and contributions.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Mobile number
                </Label>
                <Input
                  id="profile-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +65 9123 4567"
                />
                <p className="text-xs text-muted-foreground">
                  Optional. For unit members to contact you.
                </p>
              </div>

              <div className="pt-2">
                <Button type="submit" disabled={saving} className="w-full">
                  {saving ? 'Saving...' : 'Save profile'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Logged in as {user?.email}
        </p>
      </motion.div>
    </div>
  )
}
