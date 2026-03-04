import type { SnackStyle } from '../types';

export interface SnackExerciseDef {
  name: string;
  description: string;
}

export interface ExerciseStep extends SnackExerciseDef {
  durationSeconds: number;
}

export interface SnackPackInfo {
  id: SnackStyle;
  title: string;
  subtitle: string;
  /** Full explanation for onboarding: exercise type, duration, what it means */
  explanation: string;
  exercises: SnackExerciseDef[];
  format: string;
}

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Get 2–3 exercises with durations that fit total duration (minutes). */
export function getExerciseSteps(style: SnackStyle, durationMinutes: number): ExerciseStep[] {
  const pack = SNACK_PACKS[style];
  const totalSeconds = Math.max(30, durationMinutes * 60);
  const count = style === 'gentle' ? (durationMinutes <= 2 ? 2 : 3) : style === 'strength' ? 2 : 3;
  const shuffled = shuffleArray(pack.exercises);
  const chosen = shuffled.slice(0, Math.min(count, shuffled.length));
  const perExercise = Math.floor(totalSeconds / Math.max(1, chosen.length));

  return chosen.map((def) => ({
    ...def,
    durationSeconds: Math.max(20, perExercise),
  }));
}

export const SNACK_PACKS: Record<SnackStyle, SnackPackInfo> = {
  gentle: {
    id: 'gentle',
    title: 'Gentle Mobility',
    subtitle: 'Reduce stiffness. Meeting Friendly',
    explanation: 'Best for when you want to stay seated or need something subtle',
    exercises: [
      {
        name: 'Twist Your Upper Body',
        description:
          'Stand or sit tall. Cross your arms over your chest and slowly turn your shoulders to the right, then left.',
      },
      {
        name: 'Front of Hip Stretch',
        description:
          'Stand tall. Step one foot back, keep your back leg straight, and gently push your hips forward until you feel a stretch in the front of the back leg.',
      },
      {
        name: 'Seated Figure-4 Stretch',
        description:
          'Sit down. Cross one ankle over the opposite knee and gently lean your torso forward until you feel a stretch.',
      },
      {
        name: 'Standing Hamstring Stretch',
        description:
          'Stand tall. Place one heel slightly in front of you with that leg straight and bend forward at the hips.',
      },
      {
        name: 'Slow Calf Raises',
        description:
          'Stand tall. Slowly lift your heels so you are on your toes, then lower back down with control.',
      },
      {
        name: 'Neck Stretch Series',
        description:
          'Sit or stand tall. Gently tilt your head forward, back, right, and left, moving slowly and within a comfortable range.',
      },
      {
        name: 'Shoulder Blade Squeeze',
        description:
          'Stand tall. Pull your shoulders back and squeeze your shoulder blades together briefly, then relax.',
      },
      {
        name: 'Overhead Reach + Side Bend',
        description:
          'Reach both arms overhead. Lean gently to one side, then the other, keeping your chest facing forward.',
      },
      {
        name: 'Ankle Circles',
        description:
          'Lift one foot slightly off the ground and slowly circle your ankle. Switch sides after a few circles.',
      },
      {
        name: 'Standing Quad Stretch',
        description:
          'Stand tall. Hold one foot behind you and gently pull your heel toward your glutes to stretch the front of your thigh.',
      },
    ],
    format: '2–3 movements × 30–45 seconds each',
  },
  energizing: {
    id: 'energizing',
    title: 'Energizing Movement',
    subtitle: 'Boost circulation and energy',
    explanation: 'Best for a quick energy boost without getting sweaty',
    exercises: [
      {
        name: 'March in Place',
        description:
          'Stand tall and lift your knees one at a time like you are marching, swinging your arms comfortably.',
      },
      {
        name: 'Bodyweight Squats',
        description:
          'Stand with feet shoulder-width apart. Sit your hips back like you are sitting into a chair, then stand back up.',
      },
      {
        name: 'Step-Back Lunges',
        description:
          'Stand tall. Step one foot back and lower slightly, then step back up. Switch sides in a steady rhythm.',
      },
      {
        name: 'Jumping Jacks / Step Jacks',
        description:
          'Jump feet out while raising arms overhead, or step one foot out at a time instead of jumping for a low-impact version.',
      },
      {
        name: 'High Knees (March or Light Jog)',
        description:
          'Lift your knees higher than normal while marching or lightly jogging in place, keeping your posture tall.',
      },
      {
        name: 'Quick Step-Backs',
        description:
          'From standing, step one foot quickly back and return to center, then switch feet in a smooth rhythm.',
      },
      {
        name: 'Stair Climb',
        description:
          'Walk up and down a short set of stairs at a steady, comfortable pace while holding a handrail if needed.',
      },
      {
        name: 'Side-to-Side Shuffle',
        description:
          'Take quick, small steps to the right for a few counts, then to the left, keeping knees soft and movements light.',
      },
      {
        name: 'Mountain Climbers (Slow)',
        description:
          'Place hands on a desk or wall. Step one knee forward toward your chest at a time, moving in a controlled, steady pace.',
      },
      {
        name: 'Skater Steps',
        description:
          'Step one foot out to the side while swinging the opposite arm across your body, then switch sides in a rhythmic motion.',
      },
    ],
    format: '30–60 seconds per movement',
  },
  strength: {
    id: 'strength',
    title: 'Mini Strength Sets',
    subtitle: 'Build Long-term Endurance',
    explanation: 'Best to help add a bit of resistance without equipment',
    exercises: [
      {
        name: 'Wall or Desk Push-Ups',
        description:
          'Place your hands on a wall or desk, walk your feet back, lower your chest toward it, then push back to start.',
      },
      {
        name: 'Bodyweight Squats',
        description:
          'Stand with feet hip- or shoulder-width apart, sit back like into a chair, and stand up tall again.',
      },
      {
        name: 'Wall Sit',
        description:
          'Lean your back against a wall and slide down until your knees are bent comfortably, then hold the position.',
      },
      {
        name: 'Glute Bridges',
        description:
          'Lie on your back with knees bent and feet flat, then push your hips upward and lower slowly with control.',
      },
      {
        name: 'Chair Dips',
        description:
          'Place your hands on the edge of a sturdy chair behind you, bend your elbows to lower slightly, then push back up.',
      },
      {
        name: 'Calf Raises',
        description:
          'Stand tall. Lift your heels off the ground to rise onto your toes, then lower slowly back down.',
      },
      {
        name: 'Split Squats',
        description:
          'Stand with one foot slightly behind the other, bend both knees slightly, then stand back up and switch sides.',
      },
      {
        name: 'Plank Hold',
        description:
          'Place your forearms on a desk, wall, or the floor, step your feet back, and hold your body in a straight line.',
      },
      {
        name: 'Superman Hold',
        description:
          'Lie face down and gently lift your arms and legs a few inches off the ground, holding briefly before lowering.',
      },
      {
        name: 'Dead Bug',
        description:
          'Lie on your back with arms up and knees bent, then slowly lower the opposite arm and leg toward the floor and switch sides.',
      },
    ],
    format: '1–2 small sets, low reps',
  },
};
