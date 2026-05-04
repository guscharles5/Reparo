'use client'

import dynamic from 'next/dynamic'

const ReparoApp = dynamic(() => import('../components/ReparoApp.jsx'), { ssr: false })

export default function Home() {
  return <ReparoApp />
}
