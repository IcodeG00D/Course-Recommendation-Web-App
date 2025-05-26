from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
from Recommend import generate_recommendations
import psycopg2
import os

app = Flask(__name__)
CORS(app)

df = pd.read_csv("udemy_courses.csv")

# PostgreSQL connection parameters from environment variables
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", 5432))
DB_NAME = os.getenv("DB_NAME", "coursedb")
DB_USER = os.getenv("DB_USER", "myuser")
DB_PASS = os.getenv("DB_PASS", "mypass")

def get_db_connection():
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASS
    )

@app.route("/recommend", methods=["POST"])
def recommend():
    data = request.json
    user_name = data.get("user_name", "")
    active_course_title = data.get("active_course_title", "")
    completion_dict = data.get("completion_percent", {})

    if not active_course_title or not completion_dict:
        return jsonify({"error": "Missing data"}), 400

    try:
        recommendations = generate_recommendations(user_name, active_course_title, completion_dict)
        return jsonify({"recommendations": recommendations})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/subjects", methods=["GET"])
def get_subjects():
    subjects = df['subject'].dropna().unique().tolist()
    return jsonify({"subjects": subjects})

@app.route("/top-courses/<subject>", methods=["GET"])
def top_courses_by_subject(subject):
    filtered_df = df[df['subject'] == subject]
    top_courses_df = filtered_df.sort_values(by="num_subscribers", ascending=False).head(20)
    courses = top_courses_df[["course_title", "published_timestamp", "num_reviews", "num_subscribers", "content_duration","subject"]].to_dict(orient="records")
    return jsonify({"top_courses": courses})

@app.route("/store_user", methods=["POST"])
def store_user():
    data = request.get_json()
    user_name = data.get("name")
    # subject = data.get("subject")

    if not user_name:
        return jsonify({"error": "Missing name"}), 400

    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO users (user_name) VALUES (%s)",
            (user_name,),
        )
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"message": "User stored successfully"})
    except Exception as e:
        print("Error in /store_user:", e)
        return jsonify({"error": "Database error"}), 500

@app.route('/enroll_course', methods=['POST'])
def enroll_course():
    data = request.get_json()
    print(f"📦 Received JSON: {data}")
    user_name = data.get('user_name')
    course_name = data.get('course_name')
    c_subject = data.get('c_subject') 

    print(f"👤 user_name: {user_name}")
    print(f"📘 course_name: {course_name}")
    print(f"📚 subject: {c_subject}")


    if not user_name or not course_name:
        return jsonify({'error': 'Missing data'}), 400

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Get user_id from users table
        cur.execute("SELECT id FROM users WHERE user_name = %s", (user_name,))
        user = cur.fetchone()

        if not user:
            return jsonify({'error': 'User not found'}), 404

        user_id = user[0]

        # Insert into enrollments
        cur.execute("INSERT INTO enrollments (user_id, course, c_subject) VALUES (%s, %s, %s)",(user_id, course_name, c_subject))


        conn.commit()
        cur.close()
        conn.close()

        return jsonify({'message': 'Course enrolled successfully'}), 200

    except Exception as e:
        print(e)
        return jsonify({'error': 'Server error'}), 500
    

@app.route('/unenroll_course', methods=['DELETE', 'OPTIONS'])
def unenroll_course():
    if request.method == 'OPTIONS':
        # Handle preflight CORS request
        return '', 200

    # existing DELETE handling code below
    data = request.get_json()
    user_name = data.get('user_name')
    course_name = data.get('course_name', '').strip()

    print(f"UNENROLL REQUEST — user: {user_name}, course: {course_name}")

    if not user_name or not course_name:
        return jsonify({'error': 'Missing data'}), 400

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("SELECT id FROM users WHERE user_name = %s", (user_name,))
        user = cur.fetchone()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        user_id = user[0]
        print(f"[DEBUG] Trying to delete course: '{course_name}' for user_id: {user_id}")

        cur.execute("SELECT course FROM enrollments WHERE user_id = %s", (user_id,))
        print("[DEBUG] Courses enrolled for user:", cur.fetchall())

        cur.execute("""
            DELETE FROM enrollments 
            WHERE user_id = %s AND LOWER(TRIM(course)) = LOWER(TRIM(%s))
            """, (user_id, course_name))

        if cur.rowcount == 0:
            conn.commit()
            cur.close()
            conn.close()
            return jsonify({'error': f'Enrollment not found for user_id {user_id} and course "{course_name}"'}), 404

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({'message': 'Enrollment deleted successfully'}), 200

    except Exception as e:
        print("Error in /unenroll_course:", e)
        return jsonify({'error': 'Server error'}), 500

@app.route('/merged-enrollments/<user_name>', methods=['GET'])
def merged_enrollments(user_name):
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        query = """
            SELECT u.id, u.user_name, e.course, e.c_subject, e.progress
            FROM users u
            JOIN enrollments e ON u.id = e.user_id
            WHERE u.user_name = %s
        """
        cur.execute(query, (user_name,))
        rows = cur.fetchall()

        merged_data = []
        for row in rows:
            merged_data.append({
                "id": row[0],
                "name": row[1],
                "course": row[2],
                "subject": row[3],
                "progress": row[4]  # now including c_subject
            })

        cur.close()
        conn.close()
        print("Merged Data JSON:", merged_data)
        return jsonify(merged_data)

    except Exception as e:
        print("Error in /merged-enrollments:", e)
        return jsonify({"error": "Server error"}), 500

@app.route('/update_progress', methods=['POST'])
def update_progress():
    data = request.get_json()
    user_name = data.get('user_name')
    course_name = data.get('course_name')
    progress = data.get('progress')

    if not user_name or not course_name or progress is None:
        return jsonify({'error': 'Missing data'}), 400

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Get user_id
        cur.execute("SELECT id FROM users WHERE user_name = %s", (user_name,))
        user = cur.fetchone()

        if not user:
            return jsonify({'error': 'User not found'}), 404

        user_id = user[0]

        # Update progress
        cur.execute("""
            UPDATE enrollments 
            SET progress = %s 
            WHERE user_id = %s AND course = %s
        """, (progress, user_id, course_name))

        if cur.rowcount == 0:
            return jsonify({'error': 'Enrollment not found'}), 404

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({'message': 'Progress updated successfully'}), 200

    except Exception as e:
        print("Error in /update_progress:", e)
        return jsonify({'error': 'Server error'}), 500
    
@app.route('/enrollments/<user_name>', methods=['GET'])
def get_enrollments(user_name):
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT e.course, e.c_subject, e.progress
            FROM enrollments e
            JOIN users u ON e.user_id = u.id
            WHERE u.user_name = %s
        """, (user_name,))
        rows = cur.fetchall()

        enrollments = [
            {
                'course_title': row[0],
                'subject': row[1],
                'progress': row[2]
            } for row in rows
        ]

        cur.close()
        conn.close()
        return jsonify(enrollments)

    except Exception as e:
        print("Error in get_enrollments:", e)
        return jsonify({'error': 'Server error'}), 500



if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=5000)
