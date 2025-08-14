// Reference video data for volleyball skills
export interface ReferenceVideo {
  skill: string;
  url: string;
  description: string;
  keyPoints: string[];
}

export const referenceVideos: ReferenceVideo[] = [
  {
    skill: "Serve",
    url: "/reference-videos/serve-reference.mp4",
    description: "Proper overhand serve technique",
    keyPoints: ["Toss placement", "Contact point", "Follow-through", "Body positioning"]
  },
  {
    skill: "Spike",
    url: "/reference-videos/spike-reference.mp4", 
    description: "Proper spiking approach and attack",
    keyPoints: ["Approach steps", "Jump timing", "Arm swing", "Contact point"]
  },
  {
    skill: "Block",
    url: "/reference-videos/block-reference.mp4",
    description: "Proper blocking technique",
    keyPoints: ["Hand positioning", "Jump timing", "Penetration", "Landing"]
  },
  {
    skill: "Pass",
    url: "/reference-videos/pass-reference.mp4",
    description: "Proper passing/bumping technique", 
    keyPoints: ["Platform angle", "Body position", "Contact point", "Follow-through"]
  },
  {
    skill: "Set",
    url: "/reference-videos/set-reference.mp4",
    description: "Proper setting technique",
    keyPoints: ["Hand position", "Body positioning", "Release point", "Trajectory"]
  }
];

export const getSkillOptions = () => {
  return referenceVideos.map(video => video.skill);
};

export const getReferenceVideo = (skill: string): ReferenceVideo | undefined => {
  return referenceVideos.find(video => video.skill === skill);
};