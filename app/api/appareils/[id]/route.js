import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const getAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const getUserId = async (req) => {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await getAdmin().auth.getUser(token)
  return user?.id || null
}

export async function DELETE(req, { params }) {
  const uid = await getUserId(req)
  if (!uid) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  const { id } = params

  const { error } = await getAdmin()
    .from('conversations')
    .delete()
    .eq('id', id)
    .eq('user_id', uid)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
