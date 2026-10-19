/**
 * Returns dynamic time-based greeting according to user's local time:
 * - 05:00 - 11:59: Good Morning
 * - 12:00 - 16:59: Good Afternoon
 * - 17:00 - 20:59: Good Evening
 * - 21:00 - 04:59: Good Night
 */
export const getTimeBasedGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return 'Good Morning';
  } else if (hour >= 12 && hour < 17) {
    return 'Good Afternoon';
  } else if (hour >= 17 && hour < 21) {
    return 'Good Evening';
  } else {
    return 'Good Night';
  }
};
