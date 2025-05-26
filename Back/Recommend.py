import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import random

df = pd.read_csv("udemy_courses.csv")

# Filter relevant columns
df = df[['course_id', 'course_title', 'subject', 'num_subscribers', 'num_reviews', 'price', 'is_paid', 'level', 'content_duration']]
df['combined_features'] = df['course_title'] + ' ' + df['subject']

tfidf = TfidfVectorizer(stop_words='english')
tfidf_matrix = tfidf.fit_transform(df['combined_features'])

def get_similar_courses(course_list, num_recs, completion_dict):
    if not course_list:
        return pd.DataFrame()
    weighted_sim = pd.Series(0, index=df.index, dtype=float)
    for course in course_list:
        idx = df.index[df['course_title'] == course]
        if len(idx) == 0:
            continue
        idx = idx[0]
        sim_scores = cosine_similarity(tfidf_matrix[idx], tfidf_matrix).flatten()
        weighted_sim += sim_scores * completion_dict.get(course, 0)
    denom = sum([completion_dict.get(c, 0) for c in course_list if c in completion_dict])
    if denom == 0:
        denom = 1
    weighted_sim /= denom
    sim_courses = df.loc[weighted_sim.nlargest(len(df)).index]
    sim_courses = sim_courses[~sim_courses['course_title'].isin(completion_dict.keys())]
    top_indices = weighted_sim.nlargest(len(df)).index
    top_indices_in_sim_courses = [i for i in top_indices if i in sim_courses.index]
    sim_courses = sim_courses.loc[top_indices_in_sim_courses]
    sim_courses = sim_courses.assign(similarity=weighted_sim.loc[sim_courses.index])
    sim_courses = sim_courses.sort_values(['similarity', 'num_subscribers'], ascending=[False, False])
    return sim_courses.head(num_recs)

def recommend_courses_by_subject(df, active_course_title, completion_dict):
    # Group user's completed courses by subject with their completion %
    subject_completion = {}
    for course, comp in completion_dict.items():
        subj = df.loc[df['course_title'] == course, 'subject']
        if len(subj) == 0:
            continue
        subj = subj.values[0]
        if subj not in subject_completion:
            subject_completion[subj] = []
        subject_completion[subj].append((course, comp))

    
    subject_avg_completion = {subj: np.mean([c for _, c in courses]) for subj, courses in subject_completion.items()}
    sorted_subjects = sorted(subject_avg_completion.items(), key=lambda x: x[1], reverse=True)

    rec_counts = {}
    if len(sorted_subjects) > 0:
        rec_counts[sorted_subjects[0][0]] = 5
    if len(sorted_subjects) > 1:
        rec_counts[sorted_subjects[1][0]] = 4

    total_subject_recs = sum(rec_counts.values())
    total_recs = 12
    other_recs_count = total_recs - total_subject_recs

    recommendations_list = []

    for subj, count in rec_counts.items():
        courses_in_subj = [c for c, _ in subject_completion[subj]]
        recs = get_similar_courses(courses_in_subj, count, completion_dict)
        recommendations_list.append(recs)

    completed_courses = set(completion_dict.keys())
    recommended_subjects = set(rec_counts.keys())
    other_courses = df[
        (~df['course_title'].isin(completed_courses)) &
        (~df['subject'].isin(recommended_subjects))
    ]

    if len(other_courses) > 0 and other_recs_count > 0:
        random_other_recs = other_courses.sample(n=min(other_recs_count, len(other_courses)),
                                                 random_state=random.randint(1, 10000))
        recommendations_list.append(random_other_recs)

    combined_recs = pd.concat(recommendations_list)
    combined_recs = combined_recs.drop_duplicates(subset=['course_title']).sample(frac=1, random_state=random.randint(1, 10000))
    return combined_recs.head(total_recs)

def generate_recommendations(user_name, active_course_title, completion_dict):
    recommendations = recommend_courses_by_subject(df, active_course_title, completion_dict)
    recs_list = recommendations[['course_title', 'subject', 'num_subscribers', 'num_reviews', 'content_duration']].to_dict(orient='records')
    return recs_list
