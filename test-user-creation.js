// This is a test script to debug the user creation issue

const testUserCreation = async () => {
  try {
    // Test data for a new user
    const testUser = {
      username: "testuser123",
      name: "Test User",
      email: "testuser@example.com",
      password: "password123",
      isAdmin: false,
      familyId: null
    };

    console.log("Creating test user:", testUser);

    // Make POST request to register endpoint
    const response = await fetch('http://localhost:5000/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testUser),
      credentials: 'include' // Include cookies for session
    });

    console.log("Response status:", response.status);
    const data = await response.json();
    console.log("Response data:", data);

    if (response.ok) {
      console.log("User created successfully");
    } else {
      console.error("Failed to create user:", data.message);
    }
  } catch (error) {
    console.error("Error:", error);
  }
};

testUserCreation();