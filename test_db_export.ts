
import { db } from './src/services/database.ts';

// Mock localStorage
const localStorageMock = (function() {
  let store: any = {};
  return {
    getItem: function(key: string) {
      return store[key] || null;
    },
    setItem: function(key: string, value: string) {
      store[key] = value.toString();
    },
    clear: function() {
      store = {};
    },
    removeItem: function(key: string) {
      delete store[key];
    }
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// Initialize DB
db.initialize();

// Create a test assignment for Sala B
const assignment = {
    date: '2025-12-25',
    studentId: 'test-id',
    studentName: 'Test Student',
    point: 'Test Point',
    room: 'Sala B' as 'Principal' | 'Sala B',
    assistant: 'Test Assistant'
};

// Add to DB
db.addSchoolAssignment(assignment);

// Retrieve
const all = db.getSchoolAssignments();
const salaB = all.find(a => a.room === 'Sala B' && a.studentName === 'Test Student');

if (salaB) {
    console.log('SUCCESS: Sala B assignment found:', JSON.stringify(salaB));
} else {
    console.log('FAILURE: Sala B assignment not found.');
}

// Test duplicate check logic (simulation)
const assignment2 = {
    date: '2025-12-25',
    studentId: 'test-id-2',
    studentName: 'Test Student 2',
    point: 'Test Point',
    room: 'Sala B' as 'Principal' | 'Sala B', // Same room, same point, same date -> should update if we use the logic
};

// Logic from ProgramaVidaMinisterio.tsx
const existing = db.getSchoolAssignments().find(a => 
    a.date === assignment2.date && 
    a.point === assignment2.point &&
    a.room === assignment2.room
);

if (existing) {
    console.log('SUCCESS: Duplicate found (correct behavior). Updating...');
    db.updateSchoolAssignment(existing.id, assignment2);
} else {
    console.log('FAILURE: Duplicate NOT found (incorrect behavior for update logic).');
    db.addSchoolAssignment(assignment2);
}

// Verify update
const updated = db.getSchoolAssignments().find(a => a.id === salaB?.id);
console.log('Updated assignment:', JSON.stringify(updated));

// Test distinct room
const assignmentPrincipal = {
    date: '2025-12-25',
    studentId: 'test-id-3',
    studentName: 'Principal Student',
    point: 'Test Point', // Same point name
    room: 'Principal' as 'Principal' | 'Sala B'
};

const existingPrincipal = db.getSchoolAssignments().find(a => 
    a.date === assignmentPrincipal.date && 
    a.point === assignmentPrincipal.point &&
    a.room === assignmentPrincipal.room
);

if (existingPrincipal) {
    console.log('FAILURE: Principal assignment found (should not exist yet).');
} else {
    console.log('SUCCESS: Principal assignment not found (correct). Adding...');
    db.addSchoolAssignment(assignmentPrincipal);
}

const finalCount = db.getSchoolAssignments().filter(a => a.date === '2025-12-25').length;
console.log('Final count for date (should be 2):', finalCount);
