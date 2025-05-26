import React, { useEffect, useState } from "react";
import axios from "axios";
import subjectImages from './subjectImages';

const API_URL = "http://localhost:5000";



const HomeFeed = ({
  activeCourse,
  completionPercent,
  onEnroll,
  onBackToCourses,
  enrolledCourses,
  updateProgress
}) => {
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    let courseToUse = activeCourse;

    // Fallback: use course with highest progress
    if (!courseToUse && enrolledCourses.length > 0) {
      courseToUse = enrolledCourses.reduce((a, b) => {
        return (completionPercent[a.course_title] || 0) > (completionPercent[b.course_title] || 0)
          ? a
          : b;
      }).course_title;
    }

    if (courseToUse && Object.keys(completionPercent).length > 0) {
      axios
        .post(`${API_URL}/recommend`, {
          active_course_title: courseToUse,
          completion_percent: completionPercent,
        })
        .then((response) => {
          setRecommendations(response.data.recommendations || []);
        })
        .catch((error) => {
          console.error("Error fetching recommendations:", error);
        });
    }
  }, [activeCourse, completionPercent, enrolledCourses]);


  return (
    <div className="homefeed-wrapper">
      <h2 className="section-title">Recommended Courses</h2>

      {recommendations.length === 0 ? (
        <p>No recommendations available.</p>
      ) : (
        <div className="recommendation-grid-3">
          {recommendations.map((course, index) => {
            const isEnrolled = enrolledCourses.some(
              (enrolled) => enrolled.course_title === course.course_title
            );

            return (
              <div key={index} className="course-tile">
                <img
                  src={subjectImages[course.subject] || subjectImages.default}
                  alt={course.subject}
                  className="course-image"
                />
                <h3>{course.course_title}</h3>
                <p className="text-muted">Subject: {course.subject}</p>

                {isEnrolled ? (
                  <div style={{ marginTop: "10px" }}>
                    <p>Progress: {completionPercent[course.course_title] || 0}%</p>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={completionPercent[course.course_title] || 0}
                      onChange={(e) =>
                        updateProgress(course.course_title, parseInt(e.target.value))
                      }
                    />
                  </div>
                ) : (
                  <button className="enroll-button" onClick={() => onEnroll(course)}>
                    Enroll
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HomeFeed;
