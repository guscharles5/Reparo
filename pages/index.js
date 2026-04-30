import dynamic from 'next/dynamic'

const ReparoApp = dynamic(() => import('../components/ReparoApp'), { ssr: false })

export default function Home() {
  return <ReparoApp />
}
