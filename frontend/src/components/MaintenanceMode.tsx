export default function MaintenanceMode() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 md:p-12 text-center">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            VolleyTalk Bracket
          </h1>
          <div className="w-24 h-1 bg-yellow-400 mx-auto mb-6"></div>
        </div>

        <div className="space-y-6 text-white">
          <div className="text-6xl mb-4">🏐</div>

          <h2 className="text-2xl md:text-3xl font-semibold">
            Currently Being Updated
          </h2>

          <p className="text-xl md:text-2xl text-gray-200">
            We're making improvements to bring you the best bracket experience!
          </p>

          <div className="bg-white/20 rounded-lg p-6 mt-8">
            <p className="text-lg md:text-xl font-medium text-yellow-300">
              Please come back Tuesday to sign up and fill in your bracket.
            </p>
          </div>

          <p className="text-gray-300 mt-8">
            Thank you for your patience!
          </p>
        </div>
      </div>
    </div>
  );
}
