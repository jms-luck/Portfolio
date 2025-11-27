const GITHUB_USERNAME = "jms-luck";
const GITHUB_TOKEN ="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";
const GITHUB_GRAPHQL_URL =  "https://api.github.com/graphql";
const GITHUB_REST_API_URL = "https://api.github.com";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const query = `
query {
  user(login: "${GITHUB_USERNAME}") {
    name
    login
    avatarUrl
    bio
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            date
            contributionCount
          }
        }
      }
    }
    repositories(first: 10, orderBy: {field: UPDATED_AT, direction: DESC}) {
      totalCount
      nodes {
        name
        description
        url
        updatedAt
        defaultBranchRef {
          target {
            ... on Commit {
              history(first: 3) {
                edges {
                  node {
                    message
                    committedDate
                    author {
                      name
                      email
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
`;

// Fetch user activity from GitHub
async function fetchUserActivity(username) {
    try {
        // Try to fetch recent events
        const response = await fetch(`${GITHUB_REST_API_URL}/users/${username}/events?per_page=5`, {
            headers: {
                "Authorization": `Bearer ${GITHUB_TOKEN}`
            }
        });
        const events = await response.json();
        
        return events;
    } catch (error) {
        console.error("Error fetching user activity:", error);
        
        // Return sample activity if API fails
        return [
            {
                type: "PushEvent",
                repo: { name: `${username}/repository-1` },
                created_at: new Date().toISOString(),
                payload: { commits: [{ message: "Fixed a bug in the main component" }] }
            },
            {
                type: "PullRequestEvent",
                repo: { name: `${username}/repository-2` },
                created_at: new Date(Date.now() - 86400000).toISOString(),
                payload: { action: "opened", pull_request: { title: "Add new feature" } }
            },
            {
                type: "IssueCommentEvent",
                repo: { name: `${username}/repository-3` },
                created_at: new Date(Date.now() - 172800000).toISOString(),
                payload: { issue: { title: "Bug report" } }
            }
        ];
    }
}

// Determine contribution level based on count
function getContributionLevel(count) {
    if (count === 0) return 0;
    if (count <= 3) return 1;
    if (count <= 6) return 2;
    if (count <= 9) return 3;
    return 4;
}

// Render heatmap with weekdays and proper week structure
function renderHeatmap(calendar) {
    const heatmap = document.getElementById("heatmap-container");
    if (!heatmap) {
        console.error("Heatmap container not found!");
        return;
    }
    
    heatmap.innerHTML = "<h2>Contribution Heatmap</h2>";
    
    // Create the heatmap container with weekday labels
    const heatmapWrapper = document.createElement("div");
    heatmapWrapper.className = "heatmap-wrapper";
    
    // Add weekday labels
    const weekdayLabels = document.createElement("div");
    weekdayLabels.className = "weekday-labels";
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    weekdays.forEach(day => {
        const label = document.createElement("div");
        label.className = "weekday-label";
        label.textContent = day;
        weekdayLabels.appendChild(label);
    });
    heatmapWrapper.appendChild(weekdayLabels);
    
    // Create the heatmap grid
    const heatmapGrid = document.createElement("div");
    heatmapGrid.className = "heatmap-grid";
    
    // Add the calendar weeks
    if (calendar.weeks && Array.isArray(calendar.weeks)) {
        calendar.weeks.forEach(week => {
            const weekDiv = document.createElement("div");
            weekDiv.className = "week";
            
            // Create a map of days by weekday (0-6 for Sunday-Saturday)
            const daysByWeekday = {};
            if (week.contributionDays) {
                week.contributionDays.forEach(day => {
                    const date = new Date(day.date);
                    const weekday = date.getDay();
                    daysByWeekday[weekday] = day;
                });
            }
            
            // Create cells for all 7 days of the week
            for (let i = 0; i < 7; i++) {
                const dayDiv = document.createElement("div");
                dayDiv.className = "day";
                
                if (daysByWeekday[i]) {
                    const day = daysByWeekday[i];
                    const level = getContributionLevel(day.contributionCount);
                    dayDiv.setAttribute("data-count", level);
                    dayDiv.title = `${new Date(day.date).toDateString()}: ${day.contributionCount} contributions`;
                } else {
                    dayDiv.title = "No data";
                    dayDiv.setAttribute("data-count", 0);
                }
                
                weekDiv.appendChild(dayDiv);
            }

            heatmapGrid.appendChild(weekDiv);
        });
    } else {
        console.error("No weeks data found in calendar:", calendar);
    }
    
    heatmapWrapper.appendChild(heatmapGrid);
    heatmap.appendChild(heatmapWrapper);
    
    console.log("Heatmap rendered with", calendar.weeks ? calendar.weeks.length : 0, "weeks");
}

// Calculate contribution streaks using the provided algorithm
function calculateStreaks(calendar) {
    // Get all contribution days sorted by date
    const allDays = [];
    calendar.weeks.forEach(week => {
        week.contributionDays.forEach(day => {
            allDays.push(day);
        });
    });
    
    allDays.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Calculate longest streak
    let longestStreak = 0;
    let currentStreak = 0;
    let tempStreak = 0;
    
    const today = new Date().toISOString().split('T')[0];
    let isCurrentStreak = true;
    
    for (let i = allDays.length - 1; i >= 0; i--) {
        const day = allDays[i];
        
        if (day.contributionCount > 0) {
            tempStreak++;
            if (isCurrentStreak) {
                currentStreak++;
            }
        } else {
            if (isCurrentStreak) {
                isCurrentStreak = false;
            }
            tempStreak = 0;
        }
        
        if (tempStreak > longestStreak) {
            longestStreak = tempStreak;
        }
    }
    
    // Format dates for display
    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };
    
    const currentStreakDates = currentStreak > 0 
        ? `${currentStreak} days` 
        : 'No current streak';
        
    const longestStreakDates = longestStreak > 0
        ? `${longestStreak} days`
        : 'No streak found';
    
    return { 
        currentStreak, 
        longestStreak, 
        currentStreakDates, 
        longestStreakDates 
    };
}

// Main fetch function
fetch(GITHUB_GRAPHQL_URL, {
    method: "POST",
    headers: {
        "Authorization": `Bearer ${GITHUB_TOKEN}`,
        "Content-Type": "application/json"
    },
    body: JSON.stringify({ query })
})
.then(response => response.json())
.then(async data => {
    console.log("GraphQL data received:", data);
    
    if (!data || !data.data || !data.data.user || !data.data.user.contributionsCollection) {
        console.error("Invalid data structure:", data);
        return;
    }
    
    const user = data.data.user;
    const contributionData = user.contributionsCollection.contributionCalendar;
    
    if (!contributionData) {
        console.error("No contribution calendar data found");
        return;
    }
    
    const weeks = contributionData.weeks;
    
    // Populate heatmap with the new rendering function
    renderHeatmap(contributionData);
    
    // Fetch user activity
    const userActivity = await fetchUserActivity(GITHUB_USERNAME);
    
    // Create activity container if it doesn't exist
    let activityContainer = document.getElementById("activity-container");
    if (!activityContainer) {
        activityContainer = document.createElement("div");
        activityContainer.id = "activity-container";
        activityContainer.className = "p-20 m-20 br-10";
        
        // Add it after the GraphQL container
        const graphqlContainer = document.getElementById("graphql-container");
        if (graphqlContainer && graphqlContainer.nextSibling) {
            graphqlContainer.parentNode.insertBefore(activityContainer, graphqlContainer.nextSibling);
        } else {
            document.querySelector('.container').appendChild(activityContainer);
        }
    }
    
    // Display user activity
    activityContainer.innerHTML = `
        <h2>Recent Activity</h2>
        <ul class="activity-list">
            ${userActivity.map(activity => {
                let icon, content;
                
                // Format based on event type
                switch (activity.type) {
                    case 'PushEvent':
                        icon = '<i class="fa fa-code-commit"></i>';
                        content = `Pushed to <strong>${activity.repo.name}</strong>: ${activity.payload.commits?.[0]?.message || 'No message provided'}`;
                        break;
                    case 'PullRequestEvent':
                        icon = '<i class="fa fa-code-pull-request"></i>';
                        content = `${activity.payload.action} pull request in <strong>${activity.repo.name}</strong>: ${activity.payload.pull_request?.title || 'No title provided'}`;
                        break;
                    case 'IssueCommentEvent':
                        icon = '<i class="fa fa-comment"></i>';
                        content = `Commented on issue in <strong>${activity.repo.name}</strong>: ${activity.payload.issue?.title || 'No title provided'}`;
                        break;
                    default:
                        icon = '<i class="fa fa-github"></i>';
                        content = `Activity in <strong>${activity.repo.name}</strong>`;
                }
                
                const date = new Date(activity.created_at);
                const formattedDate = date.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                });
                
                return `
                    <li class="activity-item p-10 m-10 br-10">
                        ${icon}
                        <div class="activity-content">${content}</div>
                        <span class="activity-date">${formattedDate}</span>
                    </li>
                `;
            }).join('')}
        </ul>
    `;
    
    // Display GraphQL data
    const graphqlContainer = document.getElementById("graphql-container");
    graphqlContainer.innerHTML = `
        <h2>GitHub Profile</h2>
        <div class="profile-card p-20">
            <img src="${user.avatarUrl}" alt="${user.login}" class="avatar">
            <div class="profile-info">
                <h3>${user.name || user.login}</h3>
                <p>${user.bio || 'No bio available'}</p>
                <p><strong>Total Repositories:</strong> ${user.repositories.totalCount}</p>
            </div>
        </div>
    `;
    
    // Display contribution stats with the new calculation method
    const contributionStats = document.getElementById("contribution-stats");
    const { currentStreak, longestStreak, currentStreakDates, longestStreakDates } = calculateStreaks(contributionData);
    
    contributionStats.innerHTML = `
        <h2>Contribution Stats</h2>
        <div class="stats-card">
            <div class="stat-item">
                <h3>Total Contributions</h3>
                <p class="stat-value">${contributionData.totalContributions}</p>
            </div>
            <div class="stat-item">
                <h3>Current Streak</h3>
                <p class="stat-value">${currentStreak} days</p>
                <p class="stat-dates">Current streak</p>
            </div>
            <div class="stat-item">
                <h3>Longest Streak</h3>
                <p class="stat-value">${longestStreak} days</p>
                <p class="stat-dates">Longest streak</p>
            </div>
        </div>
    `;
})
.catch(error => {
    console.error("Error fetching GitHub data:", error);
    document.getElementById("graphql-container").innerHTML = `
        <div class="error-message p-20 m-20 br-10">
            <h2>Error Loading GitHub Data</h2>
            <p>There was a problem fetching data from GitHub's GraphQL API.</p>
            <p>Error: ${error.message}</p>
        </div>
    `;
});
