// App.jsx
import React, { useState } from "react";

const mockSubjects = [
  "Web Development",
  "Data Science",
  "Marketing",
  "Photography",
  "Finance",
  "Design",
];

export default function App() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");

  const handleNext = () => {
    if (name && selectedSubject) {
      setStep(2);
    } else {
      alert("Please enter your name and select a subject");
    }
  };

  return (
      <div className="min-h-screen bg-gray-100 font-sans p-8">
        {/* Global Heading */}
        

      {/* Centered Content */}
      <div className="flex flex-col items-center justify-center">
        <h1 className="text-4xl font-bold text-center text-blue-700 mb-10">
          Course Recommender
        </h1>
        {step === 1 && (
          <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4 text-center">Welcome!</h2>
            <input
              type="text"
              placeholder="Enter your name"
              className="w-full mb-4 p-2 border rounded"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <h3 className="text-lg font-semibold mb-2">Choose a subject:</h3>
            <select
              className="w-full p-2 border rounded mb-4"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
            >
              <option value="">-- Select a subject --</option>
              {mockSubjects.map((subj) => (
                <option key={subj} value={subj}>
                  {subj}
                </option>
              ))}
            </select>
            <button
              onClick={handleNext}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full"
            >
              Next
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              Hello, {name}! You selected{" "}
              <span className="text-blue-600">{selectedSubject}</span>.
            </h2>
            <p className="text-gray-600">
              Now we'll show you top courses in this subject.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
