import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db/client'
import { adminUsers } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (credentials) => {
        const email    = credentials?.email as string
        const password = credentials?.password as string
        if (!email || !password) return null

        const [user] = await db
          .select()
          .from(adminUsers)
          .where(eq(adminUsers.email, email))
          .limit(1)

        if (!user) return null

        const valid = await bcrypt.compare(password, user.passwordHash)
        if (!valid) return null

        return { id: String(user.id), email: user.email }
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  session: { strategy: 'jwt' },
})
