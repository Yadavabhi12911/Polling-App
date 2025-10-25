import Signup from "./pages/SingUp"

const App = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl mb-8">
            <span className="text-2xl font-bold text-white">PF</span>
          </div>
          <div>
            <h1 className="text-6xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent mb-4">
              PollFlow
            </h1>
            <p className="text-xl text-gray-600 max-w-md mx-auto leading-relaxed">
              Welcome to the future of polling. Create, participate, and analyze polls with AI assistance.
            </p>
          </div>
          <Signup/>
        </div>
      </div>
    </div>
  )
}

export default App
