// Reference video data for volleyball skills
export interface ReferenceVideo {
  skill: string;
  url: string;
  description: string;
  keyPoints: string[];
}

export const referenceVideos: ReferenceVideo[] = [
  {
    skill: "Setting",
    url: "/reference-videos/setting-reference.mp4",
    description: "Proper setting technique",
    keyPoints: ["Hand position", "Body positioning", "Release point", "Trajectory"]
  },
  {
    skill: "Digging",
    url: "/reference-videos/digging-reference.mp4",
    description: "Proper digging/defensive technique", 
    keyPoints: ["Platform angle", "Body position", "Contact point", "Follow-through"]
  }
];

export const getSkillOptions = () => {
  return referenceVideos.map(video => video.skill);
};

export const getReferenceVideo = (skill: string): ReferenceVideo | undefined => {
  return referenceVideos.find(video => video.skill === skill);
};