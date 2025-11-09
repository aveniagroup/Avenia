interface TeamMember {
  id: string;
  full_name: string;
  email: string;
}

export default function suggestion(teamMembers: TeamMember[]) {
  return {
    items: ({ query }: { query: string }) => {
      return teamMembers
        .filter((member) =>
          member.full_name.toLowerCase().includes(query.toLowerCase()) ||
          member.email.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 5);
    },
  };
}