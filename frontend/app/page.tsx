import { ProjectList } from "@/components/ProjectList"

export default function Home() {
  return (
    <main className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">项目总览</h1>
        <p className="text-slate-500 mt-2">管理您的所有合同项目</p>
      </div>

      <ProjectList />
    </main>
  )
}
