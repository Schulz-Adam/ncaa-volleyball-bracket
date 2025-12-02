interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  isFirstTime?: boolean;
}

export default function RulesModal({ isOpen, onClose, isFirstTime = false }: RulesModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">
            {isFirstTime ? 'Welcome to VolleyTalk Bracket!' : 'Rules & Information'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-6 space-y-6">
          {/* Welcome Message */}
          <div className="prose max-w-none">
            <p className="text-gray-700 leading-relaxed">
              Hi Everyone welcome to the VolleyTalk NCAA women's playoff bracket. First I want to say thank you for supporting VolleyTalk, its crazy that Sarah and I have been doing this for over a year already. We have had so much fun talking volleyball, interacting with all of you and answering questions. As most of you know Sarah and I did a fantasy volleyball league this year and we had a ton of fun. My goal is to build several fantasy volleyball games over the coming year so everyone can participate and make following the sport more enjoyable. This is hopefully the first project of many that we can all play in the coming year.
            </p>
          </div>

          {/* Notes About the Bracket */}
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">A few notes about the bracket:</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>This was put together in a week and I apologize if you experience any issues, please let me know either on the YouTube Channel or Instagram and I will do my best to fix it. I have had minimal time to test but it seems to be stable.</li>
              <li>It was tested on a computer using Chrome, this will give you the best experience</li>
              <li>There is currently no password reset so don't forget your password. I will try and put this in place next week.</li>
              <li>The bracket will close at 12pm Eastern. At this point whatever state your bracket is in will be finalized.</li>
              <li>The leader board should be up after the first round of matches is complete.</li>
            </ol>
          </div>

          {/* How the Bracket Works */}
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">How the bracket works:</h3>
            <p className="text-gray-700 leading-relaxed">
              For each match tile you must select the team you believe will win and the number of sets you believe the match will be over in. Once you do this the selected team will be highlighted in the next round. Once you select both teams for the next round that match card will become active and you will be able to repeat the process all the way to the final. If you click the little red x on the top of the match card you can reset you selection. Note if you remove a team earlier in the bracket and have them selected further on this will cause all those matches to be reset.
            </p>
          </div>

          {/* Scoring */}
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Scoring:</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              For each correct team pick you will receive 1 point. If you get the number of sets correct a multiplier for that round will be applied to your score. The multipliers increase as the rounds progress.
            </p>
            <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="bg-white rounded p-3 border border-gray-200">
                <div className="font-semibold text-gray-900">Round 64</div>
                <div className="text-blue-600 font-bold">x1.1</div>
              </div>
              <div className="bg-white rounded p-3 border border-gray-200">
                <div className="font-semibold text-gray-900">Round 32</div>
                <div className="text-blue-600 font-bold">x1.25</div>
              </div>
              <div className="bg-white rounded p-3 border border-gray-200">
                <div className="font-semibold text-gray-900">Round 16</div>
                <div className="text-blue-600 font-bold">x1.5</div>
              </div>
              <div className="bg-white rounded p-3 border border-gray-200">
                <div className="font-semibold text-gray-900">Elite 8</div>
                <div className="text-blue-600 font-bold">x1.75</div>
              </div>
              <div className="bg-white rounded p-3 border border-gray-200">
                <div className="font-semibold text-gray-900">Semi</div>
                <div className="text-blue-600 font-bold">x2</div>
              </div>
              <div className="bg-white rounded p-3 border border-gray-200">
                <div className="font-semibold text-gray-900">Final</div>
                <div className="text-blue-600 font-bold">x2.5</div>
              </div>
            </div>
            <p className="text-gray-700 leading-relaxed mt-4">
              We will track and display both the total points earned and the number of correctly predicted matches.
            </p>
          </div>

          {/* Closing Message */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <p className="text-purple-900 font-medium text-center">
              Thanks for Playing and good luck with your bracket!
            </p>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          >
            {isFirstTime ? "Let's Get Started!" : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
