import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

export const BlogAnalyticsCharts = ({ blog, comments }) => {
  // Likes Bar Chart
  const likesOptions = {
    chart: { type: 'bar', height: 200 },
    title: { text: 'Likes', style: { fontSize: '14px' } },
    xAxis: { categories: ['Likes'], crosshair: true },
    yAxis: { min: 0, title: { text: 'Count' } },
    series: [{ name: 'Likes', data: [blog.likes || 0], color: '#f45b5b' }],
    credits: { enabled: false },
    legend: { enabled: false }
  };

  // Comments Bar Chart
  const commentsOptions = {
    chart: { type: 'column', height: 200 },
    title: { text: 'Comments', style: { fontSize: '14px' } },
    xAxis: { categories: ['Total Comments'], crosshair: true },
    yAxis: { min: 0, title: { text: 'Count' } },
    series: [{ name: 'Comments', data: [comments.length], color: '#7cb5ec' }],
    credits: { enabled: false },
    legend: { enabled: false }
  };

  // Views Pie Chart
  const viewsOptions = {
    chart: { type: 'pie', height: 200 },
    title: { text: 'Engagement', style: { fontSize: '14px' } },
    series: [{
      name: 'Count',
      data: [
        { name: 'Views', y: blog.views || 0, color: '#90ed7d' },
        { name: 'Likes', y: blog.likes || 0, color: '#f45b5b' },
        { name: 'Comments', y: comments.length, color: '#7cb5ec' }
      ]
    }],
    credits: { enabled: false }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="bg-white p-4 rounded-xl border">
        <HighchartsReact highcharts={Highcharts} options={likesOptions} />
      </div>
      <div className="bg-white p-4 rounded-xl border">
        <HighchartsReact highcharts={Highcharts} options={commentsOptions} />
      </div>
      <div className="bg-white p-4 rounded-xl border">
        <HighchartsReact highcharts={Highcharts} options={viewsOptions} />
      </div>
    </div>
  );
};
