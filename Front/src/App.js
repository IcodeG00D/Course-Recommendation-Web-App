import React, { useState, useEffect } from "react";
import "./App.css";
import HomeFeed from "./homefeed";
import subjectImages from "./subjectImages";

const API_URL = "http://localhost:5000";

export default function App() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [enrolledCourse, setEnrolledCourse] = useState(null);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [progress, setProgress] = useState({});
  const [showHomeFeed, setShowHomeFeed] = useState(false);

  // New state for merged table
  const [mergedTableData, setMergedTableData] = useState([]);
  const [showMergedTable, setShowMergedTable] = useState(false);
  const [loadingMergedTable, setLoadingMergedTable] = useState(false);

  const updateProgress = async (courseTitle, percent) => {
    setProgress((prev) => ({
      ...prev,
      [courseTitle]: percent,
    }));

    try {
      const res = await fetch(`${API_URL}/update_progress`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_name: name,
          course_name: courseTitle,
          progress: percent,
        }),
      });

      if (!res.ok) {
        const error = await res.text();
        console.error("Failed to update progress:", error);
      }
    } catch (err) {
      console.error("Error updating progress:", err);
    }
  };




  useEffect(() => {
    fetch(`${API_URL}/subjects`)
      .then((res) => res.json())
      .then((data) => setSubjects(data.subjects || []))
      .catch((err) => console.error("Error fetching subjects:", err));
  }, []);

  const handleNext = () => {
    if (name && selectedSubject) {
      setCourses([]);
      setEnrolledCourse(null);
      setEnrolledCourses([]);
      setMergedTableData([]);
      setProgress({});
      setShowMergedTable(false);
      setShowHomeFeed(false);
      setStep(1); 

      fetch(`${API_URL}/store_user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
        .then((res) => {
          if (!res.ok) throw new Error("Failed to store user data");
          return res.json();
        })
        .then(() => {
          setLoadingCourses(true);
          return Promise.all([
            fetch(`${API_URL}/top-courses/${encodeURIComponent(selectedSubject)}`).then((res) =>
              res.json()
            ),
            fetch(`${API_URL}/enrollments/${name}`).then((res) => res.json()),
          ]);
        })
        .then(([topCoursesData, enrollmentsData]) => {
          setCourses(topCoursesData.top_courses || []);
          setStep(2);

          // Store enrolled courses
          setEnrolledCourses(enrollmentsData || []);

          // Set progress from backend enrollments
          const progressMap = {};
          (enrollmentsData || []).forEach((enroll) => {
            progressMap[enroll.course_title] = enroll.progress || 0;
          });
          setProgress(progressMap);
        })
        .catch((err) => alert(err.message))
        .finally(() => setLoadingCourses(false));
    } else {
      alert("Please enter your name and select a subject");
    }
  };


  const handleEnroll = async (course) => {
    setEnrolledCourse(course);
    const alreadyEnrolled = enrolledCourses.some(
      (c) => c.course_title === course.course_title
    );
    if (!alreadyEnrolled) {
      setEnrolledCourses((prev) => [...prev, course]);
      setProgress((prev) => ({
        ...prev,
        [course.course_title]: 0,
      }));

      try {
        // 1. Enroll course first
        const enrollRes = await fetch(`${API_URL}/enroll_course`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_name: name,
            course_name: course.course_title,
            c_subject: course.subject,
          }),
        });

        if (!enrollRes.ok) throw new Error("Enrollment failed");

        // 2. Then update initial progress
        const progressRes = await fetch(`${API_URL}/update_progress`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_name: name,
            course_name: course.course_title,
            progress: 0,
          }),
        });

        if (!progressRes.ok) {
          const error = await progressRes.text();
          console.error("Failed to update progress:", error);
        }
      } catch (err) {
        console.error("Enrollment or progress update error:", err);
      }
    }

    setStep(3);
    setShowHomeFeed(false);
    setShowMergedTable(false);
  };


  const enrollCourse = (courseName, subject) => {
    fetch(`${API_URL}/enroll_course`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_name: name,
        course_name: courseName,
        c_subject: subject,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("Enrolled:", data);
      })
      .catch((error) => console.error("Error enrolling course:", error));
  };

  const fetchMergedTable = () => {
    setLoadingMergedTable(true);
    fetch(`${API_URL}/merged-enrollments/${name}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch merged table");
        return res.json();
      })
      .then((data) => {
        setMergedTableData(data); 
        setShowMergedTable(true);
        setShowHomeFeed(false);
        setStep(0); 
      })
      .catch((err) => alert(err.message))
      .finally(() => setLoadingMergedTable(false));
  };

  const renderNavbarButtons = () => {
    if (step === 2 && !showHomeFeed && !showMergedTable) {
      return (
        <>
          <button
            className="navbar-button"
            onClick={() => setShowHomeFeed(true)}
          >
            HomeFeed
          </button>
          <button
            className="navbar-button"
            onClick={() => {
              setStep(4);
              setShowHomeFeed(false);
              setShowMergedTable(false);
            }}
          >
            My Courses
          </button>
          <button
            className="navbar-button"
            onClick={fetchMergedTable}
            disabled={loadingMergedTable}
          >
            {loadingMergedTable ? "Loading Table..." : "Show Merged Table"}
          </button>
        </>
      );
    } else if (showHomeFeed || step === 4 || showMergedTable) {
      return (
        <button
          className="navbar-button"
          onClick={() => {
            setStep(2);
            setShowHomeFeed(false);
            setShowMergedTable(false);
          }}
        >
          Back to Courses
        </button>
      );
    }
    return null;
  };

  return (
    <div className="app-container">
      {step !== 1 && (
        <nav className="navbar">
          <h1 className="logo">Course Recommender</h1>
          <div className="navbar-right">{renderNavbarButtons()}</div>
        </nav>
      )}

      {showHomeFeed ? (
        <HomeFeed
          activeCourse={enrolledCourse?.course_title}
          completionPercent={progress}
          onEnroll={(course) => {
            handleEnroll(course);
            setStep(4);
          }}
          onBackToCourses={() => {
            setStep(2);
            setShowHomeFeed(false);
          }}
          enrolledCourses={enrolledCourses}
          updateProgress={updateProgress}
        />
      ) : showMergedTable ? (
        <div
          className="card merged-table-container"
          style={{ overflowX: "auto" }}
        >
          <h2>Merged Table Data</h2>
          {mergedTableData.length === 0 ? (
            <p>No data found.</p>
          ) : (
            <table
              className="merged-table"
              style={{ width: "100%", borderCollapse: "collapse" }}
            >
              <thead>
                <tr>
                  {Object.keys(mergedTableData[0]).map((col) => (
                    <th
                      key={col}
                      style={{
                        border: "1px solid #ddd",
                        padding: "8px",
                        backgroundColor: "#f2f2f2",
                        textAlign: "left",
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mergedTableData.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid #ddd" }}>
                    {Object.values(row).map((val, i) => (
                      <td
                        key={i}
                        style={{ border: "1px solid #ddd", padding: "8px" }}
                      >
                        {val?.toString()}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <>
          {step === 1 && (
            <>
              <div className="centered-card">
                <div className="card">
                  <h1>
                    Course Recommendation System
                  </h1>
                  <h1 className="title">Welcome!</h1>
                  <input
                    type="text"
                    placeholder="Enter your name"
                    className="input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <h2 className="subtitle">Choose a subject:</h2>
                  <select
                    className="select"
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                  >
                    <option value="">-- Select a subject --</option>
                    {subjects.map((subj) => (
                      <option key={subj} value={subj}>
                        {subj}
                      </option>
                    ))}
                  </select>
                  <button className="button" onClick={handleNext}>
                    {loadingCourses ? "Loading..." : "Next"}
                  </button>
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <div className="courses-container">
              <h2 className="courses-title">
                Hey! <span className="highlight">{name}</span>, here are the
                best courses for you in{" "}
                <span className="highlight">{selectedSubject}</span>
              </h2>
              <div className="course-grid">
                {courses.map((course, idx) => {
                  const thumbnail =
                    subjectImages[selectedSubject] || subjectImages.default;
                  const isEnrolled = enrolledCourses.some(
                    (enrolled) => enrolled.course_title === course.course_title
                  );
                  return (
                    <div key={idx} className="course-card">
                      <img
                        src={thumbnail}
                        alt={selectedSubject}
                        className="w-full h-40 object-cover rounded mb-2"
                      />
                      <h3>{course.course_title}</h3>
                      <p>Published Date: {course.published_timestamp}</p>
                      <p>Reviews: {course.num_reviews}</p>
                      <p>Currently Enrolled: {course.num_subscribers}</p>
                      <p>Course Duration: {course.content_duration}</p>
                      <p>Subject: {course.subject}</p>

                      {isEnrolled ? (
                        <div style={{ marginTop: "10px" }}>
                          <p>Progress: {progress[course.course_title] || 0}%</p>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={progress[course.course_title] || 0}
                            onChange={(e) =>
                              updateProgress(course.course_title, parseInt(e.target.value))
                            }
                          />
                        </div>
                      ) : (
                        <button
                          className="button enroll-button"
                          onClick={() => handleEnroll(course)}
                        >
                          Enroll
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              <button
                className="button"
                style={{ marginTop: "30px" }}
                onClick={() => setStep(1)}
              >
                Back to Welcome Page
              </button>
            </div>
          )}
          {step === 3 && enrolledCourse && (
            <div className="card">
              <h2>{enrolledCourse.course_title}</h2>
              <p>Track your progress:</p>
              <input
                type="range"
                min="0"
                max="100"
                value={progress[enrolledCourse.course_title] || 0}
                onChange={(e) =>
                  updateProgress(enrolledCourse.course_title, parseInt(e.target.value))
                }
              />
              <p>Completion: {progress[enrolledCourse.course_title] || 0}%</p>
              <button
                className="button"
                onClick={() => {
                  setStep(2);
                  setShowHomeFeed(false);
                }}
              >
                Back to Courses
              </button>
            </div>
          )}

          {step === 4 && (
            <div className="card">
              <h2>My Enrolled Courses</h2>
              {enrolledCourses.length === 0 ? (
                <p>You have not enrolled in any courses yet.</p>
              ) : (
                enrolledCourses.map((course, idx) => (
                  <div key={idx} className="enrolled-course">
                    <h3>{course.course_title}</h3>

                    {/* Progress slider with backend update */}
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={progress[course.course_title] || 0}
                      onChange={async (e) => {
                        const newValue = parseInt(e.target.value);

                        setProgress((prev) => ({
                          ...prev,
                          [course.course_title]: newValue,
                        }));

                        // Send update to backend
                        try {
                          const res = await fetch(`${API_URL}/update_progress`, {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                              user_name: name,
                              course_name: course.course_title,
                              progress: newValue,
                            }),
                          });
                          if (!res.ok) {
                            const errorData = await res.json();
                            console.error("Update progress failed:", errorData.error);
                          }
                        } catch (error) {
                          console.error("Failed to update progress:", error);
                        }
                      }}
                    />
                    <p>Progress: {progress[course.course_title] || 0}%</p>
                    <button
                      className="button delete-button"
                      onClick={() => {
                        // Delete enrollment from backend
                        fetch(`${API_URL}/unenroll_course`, {
                          method: "DELETE",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            user_name: name,
                            course_name: course.course_title,
                          }),
                        })
                          .then((res) => {
                            if (!res.ok)
                              throw new Error("Failed to delete enrollment");
                            return res.json();
                          })
                          .then(() => {
                            // Update frontend state after deletion
                            setEnrolledCourses((prev) =>
                              prev.filter(
                                (c) => c.course_title !== course.course_title
                              )
                            );
                            setProgress((prev) => {
                              const copy = { ...prev };
                              delete copy[course.course_title];
                              return copy;
                            });
                            // Refresh merged table data if visible
                            if (showMergedTable) fetchMergedTable();
                          })
                          .catch((err) => alert(err.message));
                      }}
                    >
                      Delete
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
