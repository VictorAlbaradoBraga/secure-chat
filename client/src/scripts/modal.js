// Modal for Add Friend
function openAddFriendModal() {
    document.getElementById("addFriendModal").style.display = "block";
  }
  
  function closeAddFriendModal() {
    document.getElementById("addFriendModal").style.display = "none";
  }
  
  // Modal for Create Group
  function openCreateGroupModal() {
    document.getElementById("createGroupModal").style.display = "block";
  }
  
  function closeCreateGroupModal() {
    document.getElementById("createGroupModal").style.display = "none";
  }
  
  // Close the modal if the user clicks outside of it
  window.onclick = function(event) {
    const modal = document.getElementById("addFriendModal");
    if (event.target === modal) {
      closeAddFriendModal();
    }
    const groupModal = document.getElementById("createGroupModal");
    if (event.target === groupModal) {
      closeCreateGroupModal();
    }
  }
  
  // Functions to handle sending friend request and creating group
  function sendFriendRequest() {
    const username = document.getElementById("friendUsername").value;
    if (username) {
      // Call the function in app.mjs to send the friend request
      sendFriendRequest(username);
      closeAddFriendModal(); // Close the modal after sending the request
    }
  }
  
  function createGroup() {
    const groupName = document.getElementById("groupName").value;
    const groupMembers = document.getElementById("groupMembers").value.split(",");
    if (groupName && groupMembers.length) {
      // Call the function in app.mjs to create the group
      createGroup(groupName, groupMembers);
      closeCreateGroupModal(); // Close the modal after creating the group
    }
  }
  